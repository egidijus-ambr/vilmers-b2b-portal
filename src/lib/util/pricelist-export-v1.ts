/**
 * Price-list export data on REST v1 (portal REST migration slice 11; backend
 * 4e38588): GET /me/pricelist-export?language= replaces the export's two
 * GraphQL reads (GetSofaPricelistExportProducts + GetPriceListName). The
 * portal still builds the workbook (./pricelist-export-jobs.ts).
 *
 * The SERVER picks the customer (X-Acting-Customer-Id target, else the
 * caller), its price list (direct, else the group's; never the default) and
 * its tags, and applies visibility. Nothing price-related is sent; the
 * answer's `customerId` / `priceListId` / `tagIds` are what the generated
 * file is keyed on (exportComboFromV1), never values computed here.
 *
 * `data` uses the GraphQL document's own keys (backend
 * src/dto/pricelistExport.dto.ts), so the workbook builder reads it
 * unchanged. Not served (and not read by the builder): the price rows'
 * `price_listId` (the GraphQL document does not select it either).
 *
 * Pure apart from the injected v1 client: no `server-only`, no Next APIs, so
 * scripts/verify-pricelist-export-v1.ts can load it.
 */
import {
  isV1ProblemError,
  v1DataGet,
  withActingRetryIfStale,
  type V1DataClientDeps,
} from "../furnisystems-sdk/client/v1-data"
import type { PricelistExportProduct } from "../furnisystems-sdk/modules/products/types"

/** GET /me/pricelist-export (backend PricelistExportSchema). */
export interface V1PricelistExport {
  customerId: number
  priceListId: number
  priceListName: string
  /** Ascending. */
  tagIds: number[]
  data: PricelistExportProduct[]
}

/**
 * Error codes the export routes answer with (`{ error }`); the account card
 * maps them to copy (pricelist-export-card ERROR_MESSAGE_KEYS).
 */
export type ExportErrorCode =
  | "not_found"
  | "no_customer"
  | "no_pricelist"
  | "not_available"
  | "forbidden"
  | "fetch_failed"

/** A classified export failure: the route answers `{ error: code }` with `status`. */
export class ExportProblemError extends Error {
  readonly code: ExportErrorCode
  readonly status: number
  constructor(code: ExportErrorCode, status: number, message?: string) {
    super(message ?? `pricelist export: ${code}`)
    this.name = "ExportProblemError"
    this.code = code
    this.status = status
  }
}

export function isExportProblemError(e: unknown): e is ExportProblemError {
  return (
    e instanceof ExportProblemError ||
    (e as { name?: unknown } | null)?.name === "ExportProblemError"
  )
}

export const EXPORT_NO_CUSTOMER = "EXPORT_NO_CUSTOMER"
export const EXPORT_NO_PRICE_LIST = "EXPORT_NO_PRICE_LIST"

/**
 * A v1 failure of GET /me/pricelist-export as the route's error code.
 * Returns null for a 401 (the caller re-runs the call on GraphQL: the
 * "usable token" premise was false). Everything else fails closed:
 *   404                           -> not_found   (export switched off, or the
 *                                    acting customer is gone)
 *   409 EXPORT_NO_CUSTOMER        -> no_customer (agent / admin, no customer)
 *   409 EXPORT_NO_PRICE_LIST      -> no_pricelist
 *   403 ACTING_NOT_ALLOWED        -> no_customer (only after the one retry
 *                                    without the header also failed with it,
 *                                    which cannot happen; kept explicit)
 *   403 (any other)               -> not_available (a login without prices)
 *   anything else (409 without a known code, 400, 429, 5xx, network)
 *                                 -> fetch_failed
 */
export function exportErrorFromV1(error: unknown): ExportProblemError | null {
  if (!isV1ProblemError(error)) {
    return new ExportProblemError("fetch_failed", 502)
  }
  if (error.status === 401) return null
  if (error.status === 404) return new ExportProblemError("not_found", 404)
  if (error.status === 409 && error.code === EXPORT_NO_CUSTOMER) {
    return new ExportProblemError("no_customer", 409)
  }
  if (error.status === 409 && error.code === EXPORT_NO_PRICE_LIST) {
    return new ExportProblemError("no_pricelist", 409)
  }
  if (error.status === 403 && error.code === "ACTING_NOT_ALLOWED") {
    return new ExportProblemError("no_customer", 409)
  }
  if (error.status === 403) return new ExportProblemError("not_available", 403)
  return new ExportProblemError("fetch_failed", 502)
}

/** Portal UI codes the backend Language enum spells differently. */
const LANGUAGE_TO_BACKEND: Record<string, string> = { da: "dk" }

export function v1ExportLanguage(language: string): string {
  const lower = language.toLowerCase()
  return LANGUAGE_TO_BACKEND[lower] ?? lower
}

/**
 * GET /me/pricelist-export with the acting header of
 * src/lib/data/v1-acting.ts actingCustomerIdForV1, as every other /me read.
 * The ONLY retry without the header is the shared rule for 403
 * ACTING_NOT_ALLOWED (withActingRetryIfStale with "never stale"): a 404 is
 * NOT retried (here it also means "export switched off", and a retry would
 * export the agent's own scope). Throws V1ProblemError.
 */
export function fetchPricelistExportV1(
  deps: V1DataClientDeps,
  req: { bearer: string; actingCustomerId: number | null; language: string }
): Promise<V1PricelistExport> {
  return withActingRetryIfStale(
    req.actingCustomerId,
    (actingCustomerId) =>
      v1DataGet<V1PricelistExport>(deps, {
        path: "/me/pricelist-export",
        query: { language: v1ExportLanguage(req.language) },
        bearer: req.bearer,
        actingCustomerId,
      }),
    async () => false,
    () => undefined
  )
}

/** The fields of ExportCombo (./pricelist-export-jobs.ts), restated to stay import-free. */
export interface ExportComboFields {
  customerId: number
  priceListId: number
  tagIds: number[]
  language: string
  coverLines: string[]
}

/**
 * The generated file's combination from the v1 ANSWER (customer, list and
 * tags as the server chose them) plus the request's language and the cover
 * lines resolved for the same customer.
 *
 * The cover lines come from the portal's acting-customer lookup
 * (getActingCustomer: GET /me with the same acting header). When the server
 * exported a DIFFERENT customer than that lookup resolved (the selection
 * changed between the two calls), the cover would describe someone else:
 * `forbidden`, nothing is built.
 */
export function exportComboFromV1(
  answer: V1PricelistExport,
  request: { language: string; coverLines: string[]; customerId: number }
): ExportComboFields {
  if (answer.customerId !== request.customerId) {
    throw new ExportProblemError(
      "forbidden",
      403,
      "pricelist export: the server exported a different customer"
    )
  }
  const tagIds = Array.from(new Set(answer.tagIds ?? [])).sort((a, b) => a - b)
  return {
    customerId: answer.customerId,
    priceListId: answer.priceListId,
    tagIds,
    language: request.language,
    coverLines: request.coverLines,
  }
}

/**
 * The combination's identity (job registry, cache meta match, eviction):
 * per customer, list, tag set, language and cover lines.
 */
export function comboIdentity(c: ExportComboFields): string {
  return `${c.customerId}|${c.priceListId}|${c.tagIds.join(",")}|${c.language}|${JSON.stringify(c.coverLines ?? [])}`
}

/**
 * The combination's part of the file cache key (pricelist-export-jobs.ts
 * comboBaseParts adds theme, versions, cover settings and fabric labels;
 * computeKey the data fingerprint). On v1 every value here is the answer's.
 */
export function comboKeyParts(c: ExportComboFields): unknown[] {
  return [c.customerId, c.priceListId, c.tagIds, c.language]
}

/**
 * Whether a job's file may be handed to the current request: same customer
 * in scope and same cover lines (the file route re-resolves both from the
 * session; the language comes from the job). The price list and tags are
 * NOT re-derived: on v1 only the server knows them, and re-running the
 * export query to authorize a download would double its cost. The job's
 * data was fetched for exactly this customer, under a session allowed to
 * act for it.
 */
export function jobBelongsTo(
  combo: ExportComboFields,
  current: { customerId: number; coverLines: string[] }
): boolean {
  return (
    combo.customerId === current.customerId &&
    JSON.stringify(combo.coverLines ?? []) === JSON.stringify(current.coverLines ?? [])
  )
}

// ------------------------------------------------- answer memo (v1 arm)

/** How long a v1 answer is reused (the GraphQL arm's FINGERPRINT_TTL_MS). */
export const EXPORT_ANSWER_TTL_MS = 15 * 60 * 1000
/** Bound on memoised answers (each can be several MB). */
export const EXPORT_ANSWER_MAX_ENTRIES = 50

/**
 * The real caller of a v1 session, from GET /auth/session `principal`
 * (never the bearer string): realm, principal id, customer account,
 * sub-account and impersonating manager. Two logins never share a key.
 */
export function exportCallerKey(principal: {
  realm?: string | null
  id?: number | null
  customerAccountId?: string | null
  subAccountId?: number | null
  impersonatedBy?: number | null
}): string {
  return JSON.stringify([
    principal.realm ?? null,
    principal.id ?? null,
    principal.customerAccountId ?? null,
    principal.subAccountId ?? null,
    principal.impersonatedBy ?? null,
  ])
}

/** Memo key: caller, the acting id SENT (or "none"), language. */
export function exportAnswerMemoKey(k: {
  callerKey: string
  actingCustomerId: number | null
  language: string
}): string {
  return JSON.stringify([
    k.callerKey,
    k.actingCustomerId ?? "none",
    v1ExportLanguage(k.language),
  ])
}

export interface ExportAnswerMemo {
  /**
   * The memoised answer for `key`, or `load()` (single-flighted per key).
   * Only a successful answer is stored; a failure is never memoised.
   */
  get(key: string, load: () => Promise<V1PricelistExport>): Promise<V1PricelistExport>
  size(): number
}

/**
 * Per-process memo of GET /me/pricelist-export answers: TTL, LRU bound
 * (Map insertion order; a hit moves the entry to the end), single-flight.
 * A hit returns the stored answer only; the caller still runs
 * exportComboFromV1 on it and the file route still checks jobBelongsTo.
 */
export function createExportAnswerMemo(
  options: { ttlMs?: number; maxEntries?: number; now?: () => number } = {}
): ExportAnswerMemo {
  const ttlMs = options.ttlMs ?? EXPORT_ANSWER_TTL_MS
  const maxEntries = Math.max(1, options.maxEntries ?? EXPORT_ANSWER_MAX_ENTRIES)
  const now = options.now ?? Date.now
  const entries = new Map<string, { answer: V1PricelistExport; at: number }>()
  const inFlight = new Map<string, Promise<V1PricelistExport>>()

  return {
    async get(key, load) {
      const hit = entries.get(key)
      if (hit) {
        entries.delete(key)
        if (now() - hit.at < ttlMs) {
          entries.set(key, hit)
          return hit.answer
        }
      }
      const pending = inFlight.get(key)
      if (pending) return pending
      const p = (async () => {
        const answer = await load()
        entries.delete(key)
        entries.set(key, { answer, at: now() })
        while (entries.size > maxEntries) {
          const oldest = entries.keys().next().value as string
          entries.delete(oldest)
        }
        return answer
      })()
      inFlight.set(key, p)
      try {
        return await p
      } finally {
        inFlight.delete(key)
      }
    },
    size: () => entries.size,
  }
}
