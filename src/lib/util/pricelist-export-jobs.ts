import "server-only"

import { createHash, randomUUID } from "crypto"
import { readFileSync } from "fs"
import { promises as fs, createReadStream } from "fs"
import path from "path"
import { Readable } from "stream"
import { sdk } from "@lib/config"
import { getPriceListName } from "@lib/data/pricelist"
import { buildPricelistWorkbook } from "@lib/util/pricelist-workbook"
import { resolvePricelistWorkbookSettings } from "@lib/util/pricelist-theme"
import { fetchPricelistPhotos } from "@lib/util/pricelist-photos"
import { fetchPricelistBlueprints } from "@lib/util/pricelist-blueprints"
import { fetchPricelistComponentPhotos } from "@lib/util/pricelist-component-photos"
import {
  createImageFetchReport,
  isImageFetchDegraded,
  TRANSIENT_FAILURE_TOLERANCE,
} from "@lib/util/image-fetch"

/**
 * Shared cache + async job registry for the pricelist XLSX export.
 *
 * The file depends only on (theme, workbook code version, price list id,
 * customer tag-id set, language, DB data) -- nothing per-customer -- so one
 * built file serves every customer with the same combo. The DB-data part is
 * covered by `dataFingerprint`, a hash of the exact products payload the
 * workbook is built from (plus the price list name).
 *
 * Production runs ONE portal process, so local disk + process memory is
 * sufficient. Process-wide state lives on `globalThis` (same pattern as a
 * Prisma client): Next route modules do not reliably share module scope and
 * dev HMR re-evaluates modules.
 */

// Bump when pricelist-workbook.ts (or the image pools) change what a built
// file looks like, so stale cached files are never served after a deploy.
export const WORKBOOK_VERSION = "5"

const COMPANY_NAME = "Vilmers"
const CURRENCY = "EUR"

const JOB_RETENTION_MS = 10 * 60 * 1000
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 60 * 1000
const MAX_CONCURRENT_BUILDS = 1
/**
 * How long a computed data fingerprint is trusted per combination. Within
 * this window a POST skips the (slow, ~8-12s for large combinations)
 * product query and goes straight to the cached file. ACCEPTED TRADE-OFF: a
 * price/data change can take up to this long to appear in an export.
 */
export const FINGERPRINT_TTL_MS = 15 * 60 * 1000
const BUILD_WATCHDOG_MS = 5 * 60 * 1000
const LOG = "[pricelist-export]"

/** Thrown when the product query itself fails (route maps to fetch_failed). */
export class ExportFetchError extends Error {}

let cachedBuildId: string | null = null
function readBuildId(): string {
  if (cachedBuildId === null) {
    try {
      cachedBuildId = readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim()
    } catch {
      cachedBuildId = "" // dev server: no BUILD_ID
    }
  }
  return cachedBuildId
}

export type JobStatus = "queued" | "running" | "ready" | "error"
export type JobStage = "images" | "building"

export interface ExportCombo {
  priceListId: number
  /** Sorted ascending. */
  tagIds: number[]
  language: string
}

interface ExportJob {
  id: string
  combo: ExportCombo
  key: string
  status: JobStatus
  stage?: JobStage
  errorCode?: string
  /** Set when ready. */
  filePath?: string
  /** True for a degraded (non-cached) build: file is job-scoped. */
  temporary: boolean
  /** When the delivered file was built (drives the filename date). */
  builtAt?: Date
  /** Set by the watchdog; a late-finishing build must then discard itself. */
  aborted?: boolean
  /** When the fingerprint behind this job was computed. */
  fpCheckedAt?: number
  finishedAt?: number
}

interface CacheMeta extends ExportCombo {
  fingerprint: string
  builtAt: string
  priceListName: string
  key: string
}

interface ExportState {
  jobs: Map<string, ExportJob>
  inFlight: Map<string, ExportJob>
  active: number
  waiters: Array<() => void>
  lastSweep: number
  initialized: boolean
  /** Freshness memo: combination (key minus fingerprint) -> last fingerprint. */
  fpMemo: Map<string, FingerprintMemo>
  /** Single-flight of the fingerprint query per combination. */
  fpInFlight: Map<string, Promise<FingerprintResult>>
}

interface FingerprintMemo {
  fingerprint: string
  cacheKey: string
  checkedAt: number
}

interface FingerprintResult {
  products: any
  priceListName: string
  nameLookupFailed: boolean
  fingerprint: string
  key: string
  checkedAt: number
}

const globalForExport = globalThis as unknown as {
  __pricelistExportState?: ExportState
}
const state: ExportState = (globalForExport.__pricelistExportState ??= {
  jobs: new Map(),
  inFlight: new Map(),
  active: 0,
  waiters: [],
  lastSweep: 0,
  initialized: false,
  fpMemo: new Map(),
  fpInFlight: new Map(),
})
// State created by an older module version (dev HMR) may lack newer fields.
state.fpMemo ??= new Map()
state.fpInFlight ??= new Map()

// ---------------------------------------------------------------- paths

function cacheDir() {
  return (
    process.env.PRICELIST_CACHE_DIR ||
    path.join(process.cwd(), ".cache", "pricelists")
  )
}
const jobsDir = () => path.join(cacheDir(), "jobs")
const filePathFor = (key: string) => path.join(cacheDir(), `${key}.xlsx`)
const metaPathFor = (key: string) => path.join(cacheDir(), `${key}.json`)

const comboId = (c: ExportCombo) =>
  `${c.priceListId}|${c.tagIds.join(",")}|${c.language}`

export function combosEqual(a: ExportCombo, b: ExportCombo): boolean {
  return comboId(a) === comboId(b)
}

// ------------------------------------------------------- fingerprinting

/**
 * Deterministic serialization: object keys sorted; EVERY array is sorted by
 * its elements' serialized form, so neither relation order from the DB nor
 * nested-id-only shapes can change the result.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null"
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).sort().join(",")}]`
  }
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`
}

export function computeFingerprint(products: unknown, pricelistName: string) {
  return createHash("sha256")
    .update(stableStringify(products))
    .update("\u0000")
    .update(pricelistName)
    .digest("hex")
}

/** Everything in the cache key except the data fingerprint. */
function comboBaseParts(combo: ExportCombo): unknown[] {
  return [
    process.env.NEXT_PUBLIC_THEME ?? "",
    WORKBOOK_VERSION,
    readBuildId(),
    stableStringify(resolvePricelistWorkbookSettings()),
    combo.priceListId,
    combo.tagIds,
    combo.language,
  ]
}

function computeBaseId(combo: ExportCombo) {
  return JSON.stringify(comboBaseParts(combo))
}

function computeKey(combo: ExportCombo, fingerprint: string) {
  return createHash("sha256")
    .update(JSON.stringify([...comboBaseParts(combo), fingerprint]))
    .digest("hex")
}

// ------------------------------------------------------- disk helpers

async function ensureInitialized() {
  if (state.initialized) return
  await fs.mkdir(jobsDir(), { recursive: true })
  state.initialized = true
  // Job registry is empty after a (re)start, so any job-scoped temp file on
  // disk is an orphan.
  for (const f of await fs.readdir(jobsDir()).catch(() => [] as string[])) {
    await fs.rm(path.join(jobsDir(), f), { force: true })
  }
}

async function readMeta(file: string): Promise<CacheMeta | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as CacheMeta
  } catch {
    return null
  }
}

async function removeEntry(key: string) {
  await fs.rm(filePathFor(key), { force: true })
  await fs.rm(metaPathFor(key), { force: true })
}

/**
 * Drops cache entries past max age, stale .tmp leftovers, and any half-
 * written pair (.xlsx without .json or vice versa) older than a minute.
 */
async function sweepIfDue() {
  const now = Date.now()
  if (now - state.lastSweep < SWEEP_INTERVAL_MS) return
  state.lastSweep = now
  try {
    const files = await fs.readdir(cacheDir())
    const names = new Set(files)
    for (const f of files) {
      const full = path.join(cacheDir(), f)
      if (f === "jobs") continue
      const st = await fs.stat(full).catch(() => null)
      if (!st) continue
      const old = now - st.mtimeMs > 60 * 1000
      if (f.endsWith(".tmp")) {
        if (now - st.mtimeMs > 60 * 60 * 1000) await fs.rm(full, { force: true })
      } else if (f.endsWith(".json")) {
        const key = f.slice(0, -5)
        const meta = await readMeta(full)
        const age = meta ? now - Date.parse(meta.builtAt) : Infinity
        if (!(age < CACHE_MAX_AGE_MS)) await removeEntry(key)
        else if (old && !names.has(`${key}.xlsx`)) await removeEntry(key)
      } else if (f.endsWith(".xlsx")) {
        if (old && !names.has(`${f.slice(0, -5)}.json`)) {
          await fs.rm(full, { force: true })
        }
      }
    }
  } catch (error) {
    console.warn(`${LOG} cache sweep failed:`, error)
  }
}

function pruneJobs() {
  const now = Date.now()
  for (const [id, job] of Array.from(state.jobs.entries())) {
    if (job.finishedAt && now - job.finishedAt > JOB_RETENTION_MS) {
      state.jobs.delete(id)
      if (job.temporary && job.filePath) {
        fs.rm(job.filePath, { force: true }).catch(() => {})
      }
    }
  }
}

async function storeCleanBuild(
  key: string,
  combo: ExportCombo,
  fingerprint: string,
  priceListName: string,
  buffer: Uint8Array,
  builtAt: Date
) {
  const tmp = `${filePathFor(key)}.tmp`
  await fs.writeFile(tmp, buffer)
  const meta: CacheMeta = {
    key,
    ...combo,
    fingerprint,
    builtAt: builtAt.toISOString(),
    priceListName,
  }
  const metaTmp = `${metaPathFor(key)}.tmp`
  await fs.writeFile(metaTmp, JSON.stringify(meta))
  // Meta first, xlsx last: a crash in between leaves a .json without an
  // .xlsx (treated as a miss and swept), never an unreferenced .xlsx.
  await fs.rename(metaTmp, metaPathFor(key))
  await fs.rename(tmp, filePathFor(key))
  // Eviction is best-effort: a failure must not turn a good build into an error.
  try {
    for (const f of await fs.readdir(cacheDir())) {
      if (!f.endsWith(".json") || f === `${key}.json`) continue
      const other = await readMeta(path.join(cacheDir(), f))
      if (other && combosEqual(other, combo)) await removeEntry(f.slice(0, -5))
    }
  } catch (error) {
    console.warn(`${LOG} eviction of older files failed:`, error)
  }
}

async function lookupCache(key: string, combo: ExportCombo) {
  const meta = await readMeta(metaPathFor(key))
  if (!meta || !combosEqual(meta, combo)) return null
  const builtAt = new Date(meta.builtAt)
  if (!(Date.now() - builtAt.getTime() < CACHE_MAX_AGE_MS)) return null
  const exists = await fs.access(filePathFor(key)).then(() => true, () => false)
  return exists ? { path: filePathFor(key), builtAt } : null
}

// ------------------------------------------------------- build limiter

async function acquireBuildSlot(onQueued: () => void) {
  if (state.active < MAX_CONCURRENT_BUILDS) {
    state.active++
    return
  }
  onQueued()
  await new Promise<void>((resolve) => state.waiters.push(resolve))
  // The releasing build handed its slot to us (active stays incremented).
}

function releaseBuildSlot() {
  const next = state.waiters.shift()
  if (next) next()
  else state.active--
}

// --------------------------------------------------------------- build

async function runBuild(
  job: ExportJob,
  products: any,
  priceListName: string,
  nameLookupFailed: boolean,
  fingerprint: string
) {
  const startedAt = Date.now()
  await acquireBuildSlot(() => {})
  // Released exactly once, by whichever of {finish, watchdog} comes first.
  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseBuildSlot()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const watchdog = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      job.aborted = true
      release()
      reject(new Error(`build exceeded ${BUILD_WATCHDOG_MS}ms watchdog`))
    }, BUILD_WATCHDOG_MS)
  })
  const work = async () => {
    job.status = "running"
    job.stage = "images"
    const report = createImageFetchReport()
    // Best-effort pools: never throw (image failure must not cost the
    // customer their price data).
    const [photos, blueprints, componentPhotos] = await Promise.all([
      fetchPricelistPhotos(products, report),
      fetchPricelistBlueprints(products, report),
      fetchPricelistComponentPhotos(products, report),
    ])
    job.stage = "building"
    const builtAt = new Date()
    const raw = await buildPricelistWorkbook(
      products,
      {
        companyName: COMPANY_NAME,
        pricelistName: priceListName,
        generatedAt: builtAt,
        currency: CURRENCY,
        language: job.combo.language,
      },
      photos,
      blueprints,
      componentPhotos,
      resolvePricelistWorkbookSettings()
    )
    if (job.aborted) return // watchdog already failed this job
    const buffer = new Uint8Array(raw as unknown as ArrayBuffer)
    // Only transient problems (and a fallback price list name) block caching;
    // caps depend on the data alone and would block it forever.
    // Cacheable only if: no deadline hit, price-list name resolved, and
    // transient image failures within TRANSIENT_FAILURE_TOLERANCE of the
    // images attempted (summed over all three pools).
    const degraded = isImageFetchDegraded(report) || nameLookupFailed
    const tolerated = Math.floor(report.attempted * TRANSIENT_FAILURE_TOLERANCE)
    if (degraded) {
      const p = path.join(jobsDir(), `${job.id}.xlsx`)
      await fs.writeFile(p, buffer)
      job.filePath = p
      job.temporary = true
    } else {
      await storeCleanBuild(job.key, job.combo, fingerprint, priceListName, buffer, builtAt)
      job.filePath = filePathFor(job.key)
      job.temporary = false
      // Point the freshness memo at the freshly stored file.
      state.fpMemo.set(computeBaseId(job.combo), {
        fingerprint,
        cacheKey: job.key,
        checkedAt: job.fpCheckedAt ?? Date.now(),
      })
    }
    job.builtAt = builtAt
    job.status = "ready"
    console.log(
      `${LOG} build finished in ${Date.now() - startedAt}ms ` +
        `(${buffer.length} bytes, ${degraded ? "DEGRADED - not cached" : "cached"}; ` +
        `deadlineHit=${report.deadlineHit} capHit=${report.capHit} ` +
        `transient=${report.transientFailures}/${report.attempted} ` +
        `(${report.transientFailures <= tolerated ? "tolerated" : "over tolerance"}) nameLookupFailed=${nameLookupFailed}) ` +
        `key=${job.key.slice(0, 12)}`
    )
  }
  try {
    await Promise.race([work(), watchdog])
  } finally {
    if (timer) clearTimeout(timer)
    release()
    watchdog.catch(() => {})
  }
}

// ----------------------------------------------------------- public API

export interface StartResult {
  jobId: string
  status: "ready" | "pending"
}

/**
 * Fetches the products (always -- needed for the fingerprint), then either
 * resolves to an already-cached file or starts/joins a background build.
 * Throws if the product fetch fails (caller maps to `fetch_failed`).
 */
async function computeFingerprintResult(
  combo: ExportCombo,
  baseId: string
): Promise<FingerprintResult> {
  const t0 = Date.now()
  let products: any
  try {
    products = await sdk.products.getSofaPricelistExportProducts({
      priceListId: combo.priceListId,
      language: combo.language,
      customerTagIds: combo.tagIds,
    })
  } catch (error) {
    // Failures are never memoized.
    console.error(`${LOG} Failed to fetch products:`, error)
    throw new ExportFetchError("product query failed")
  }
  const tQuery = Date.now() - t0
  let nameLookupFailed = false
  const priceListName = await getPriceListName(combo.priceListId).catch((error) => {
    console.error(`${LOG} Failed to fetch pricelist name:`, error)
    nameLookupFailed = true
    return `Pricelist ${combo.priceListId}`
  })
  const tFp = Date.now()
  const fingerprint = computeFingerprint(products, priceListName)
  const key = computeKey(combo, fingerprint)
  const checkedAt = Date.now()
  console.log(
    `${LOG} fingerprint: product query ${tQuery}ms, hash ${Date.now() - tFp}ms ` +
      `(total ${Date.now() - t0}ms) key=${key.slice(0, 12)}`
  )
  // A fingerprint built on a fallback price list name is not trustworthy.
  if (!nameLookupFailed) {
    state.fpMemo.set(baseId, { fingerprint, cacheKey: key, checkedAt })
  }
  return { products, priceListName, nameLookupFailed, fingerprint, key, checkedAt }
}

function readyJobFrom(
  combo: ExportCombo,
  key: string,
  cached: { path: string; builtAt: Date }
): ExportJob {
  const job: ExportJob = {
    id: randomUUID(),
    combo,
    key,
    status: "ready",
    temporary: false,
    filePath: cached.path,
    builtAt: cached.builtAt,
    finishedAt: Date.now(),
  }
  state.jobs.set(job.id, job)
  return job
}

export async function startExport(combo: ExportCombo): Promise<StartResult> {
  await ensureInitialized()
  pruneJobs()
  sweepIfDue().catch(() => {})

  const baseId = computeBaseId(combo)
  for (const [k, m] of Array.from(state.fpMemo.entries())) {
    if (Date.now() - m.checkedAt >= FINGERPRINT_TTL_MS) state.fpMemo.delete(k)
  }

  // Fast path: a fingerprint checked within the TTL whose file still exists
  // is served without the product query.
  const memo = state.fpMemo.get(baseId)
  if (memo && Date.now() - memo.checkedAt < FINGERPRINT_TTL_MS) {
    const building = state.inFlight.get(memo.cacheKey)
    if (building) return { jobId: building.id, status: "pending" }
    const memoCached = await lookupCache(memo.cacheKey, combo)
    if (memoCached) {
      const job = readyJobFrom(combo, memo.cacheKey, memoCached)
      console.log(
        `${LOG} fingerprint memo HIT (age ${Math.round((Date.now() - memo.checkedAt) / 1000)}s) ` +
          `key=${memo.cacheKey.slice(0, 12)}`
      )
      return { jobId: job.id, status: "ready" }
    }
    state.fpMemo.delete(baseId) // file evicted/swept: fall back to the query
  }

  // Single-flight the query per combination.
  let pending = state.fpInFlight.get(baseId)
  if (!pending) {
    pending = computeFingerprintResult(combo, baseId).finally(() => {
      state.fpInFlight.delete(baseId)
    })
    state.fpInFlight.set(baseId, pending)
  }
  const { products, priceListName, nameLookupFailed, fingerprint, key, checkedAt } =
    await pending

  const joined = state.inFlight.get(key)
  if (joined) return { jobId: joined.id, status: "pending" }

  const cached = await lookupCache(key, combo)
  // Re-check: another request may have started this build while we awaited.
  const joinedLate = state.inFlight.get(key)
  if (joinedLate) return { jobId: joinedLate.id, status: "pending" }

  if (cached) {
    const hit = readyJobFrom(combo, key, cached)
    console.log(`${LOG} cache HIT key=${key.slice(0, 12)}`)
    return { jobId: hit.id, status: "ready" }
  }

  const job: ExportJob = {
    id: randomUUID(),
    combo,
    key,
    status: "queued",
    temporary: false,
    fpCheckedAt: checkedAt,
  }
  state.jobs.set(job.id, job)

  console.log(`${LOG} cache MISS key=${key.slice(0, 12)}, starting build`)
  state.inFlight.set(key, job)
  // Fire and forget; every rejection is caught here so an unhandled
  // rejection can never take the process down.
  runBuild(job, products, priceListName, nameLookupFailed, fingerprint)
    .catch((error) => {
      console.error(`${LOG} build failed:`, error)
      job.aborted = true
      job.status = "error"
      job.errorCode = "unexpected"
    })
    .finally(() => {
      job.finishedAt = Date.now()
      state.inFlight.delete(key)
    })
  return { jobId: job.id, status: "pending" }
}

export function getJob(jobId: string): ExportJob | null {
  pruneJobs()
  return state.jobs.get(jobId) ?? null
}

export interface JobFile {
  stream: ReadableStream
  size: number
  builtAt: Date
}

/**
 * Opens the job's file for streaming. Never deletes: a degraded (temporary)
 * file stays available to every request sharing the job until pruneJobs
 * expires it.
 */
export async function openJobFile(job: ExportJob): Promise<JobFile | null> {
  if (job.status !== "ready" || !job.filePath) return null
  try {
    const st = await fs.stat(job.filePath)
    const stream = (Readable as any).toWeb(createReadStream(job.filePath)) as ReadableStream
    return { stream, size: st.size, builtAt: job.builtAt ?? new Date() }
  } catch {
    // Evicted by a newer build for the same combo (or removed externally).
    return null
  }
}
