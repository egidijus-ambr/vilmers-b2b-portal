import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"
import { fetchImagePool } from "./image-fetch"

// Blueprint thumbnails are tiny (measured ~400-1,300 bytes each — a 1px/cm
// crop of a plan-view line drawing) compared to the JPEG category photos,
// so more of them can be in flight at once without saturating anything.
const FETCH_CONCURRENCY = 16
const FETCH_TIMEOUT_MS = 8_000
// Unlike pricelist-photos.ts (a handful of distinct URLs at most), a large
// pricelist can plausibly reference 1,000-3,000 DISTINCT module blueprints
// (see MAX_BLUEPRINT_COUNT below) — an unbounded fetch stage here really
// could stall the export for minutes. This caps how long the pool keeps
// STARTING new fetches; see fetchImagePool's own deadline semantics.
const FETCH_DEADLINE_MS = 30_000

// PNG signature: the full 8-byte magic (not just the 4-byte
// `\x89PNG` prefix) — the trailing `0D 0A 1A 0A` is what catches a file
// mangled by a text-mode/line-ending transform somewhere upstream, which a
// 4-byte check would miss entirely.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= PNG_MAGIC.length &&
    PNG_MAGIC.every((byte, i) => buffer[i] === byte)
  )
}

// Hard embed budget. Blueprints are per-MODULE (not per-product like the
// category photo) and only geometrically identical modules share a URL, so
// a large pricelist can genuinely reach 1,000-3,000 distinct thumbnails.
// Measured thumbnails run ~400-1,300 bytes each, so the expected total for
// even the top of that range is comfortably under MAX_TOTAL_BYTES — these
// two caps exist purely as a backstop against a pathological pricelist or
// an oversized render, not because normal usage is expected to hit them.
// Never let this feature hand a customer a workbook they can't open.
const MAX_BLUEPRINT_COUNT = 3000
const MAX_TOTAL_BYTES = 8 * 1024 * 1024 // 8MB

/**
 * Minimal shape this module needs from a SofaForm's `blueprint` selection —
 * see PricelistExportSofaForm in furnisystems-sdk/modules/products/types.ts
 * for the full type and GET_SOFA_PRICELIST_EXPORT_PRODUCTS for the query.
 */
interface BlueprintBearingForm {
  blueprint: {
    thumbnail_url: string | null
    thumb_width: number | null
    thumb_height: number | null
  } | null
}

/**
 * A module's thumbnail is usable iff it has a URL AND real positive pixel
 * dimensions. Deliberately NOT gated on `blueprint.status` — the backend
 * documents `thumbnail_url` as "null unless status is rendered" (see
 * furnisystems-backend's SofaFormBlueprint.ts), so the URL's presence IS
 * the authoritative signal; re-deriving the same fact from a second field
 * (whose exact enum member spelling this codebase doesn't own) would only
 * add a way to silently blank every image if that spelling ever drifts.
 */
function isUsable(
  blueprint: BlueprintBearingForm["blueprint"]
): blueprint is {
  thumbnail_url: string
  thumb_width: number
  thumb_height: number
} {
  return (
    !!blueprint?.thumbnail_url &&
    (blueprint.thumb_width ?? 0) > 0 &&
    (blueprint.thumb_height ?? 0) > 0
  )
}

/**
 * Fetches every distinct, usable module-blueprint thumbnail URL referenced
 * by `products`, with bounded concurrency AND a hard embed budget (see
 * MAX_BLUEPRINT_COUNT / MAX_TOTAL_BYTES above), returning a url -> buffer
 * map exactly like fetchPricelistPhotos. A missing/null entry means "no
 * image for this module" and is NEVER an error — same discipline as the
 * category-photo pool this is modelled on (see pricelist-photos.ts).
 *
 * Two budget enforcement points, both intentionally at fetch time rather
 * than embed time so a huge pricelist doesn't do wasted network work first:
 *  - COUNT: the distinct-URL list is truncated to MAX_BLUEPRINT_COUNT
 *    BEFORE any fetch starts.
 *  - BYTES: a running total is checked inside `validate` (invoked
 *    synchronously per successful fetch, so this is race-free across
 *    concurrent workers — see fetchImagePool's doc comment) and any buffer
 *    that would push the total over MAX_TOTAL_BYTES is rejected exactly
 *    like a failed fetch.
 */
export async function fetchPricelistBlueprints(
  products: PricelistExportProduct[]
): Promise<Map<string, Buffer | null>> {
  const urls = new Set<string>()
  for (const product of products) {
    for (const form of product.advanced_product?.sofa_forms ?? []) {
      const blueprint = (form as BlueprintBearingForm).blueprint
      if (isUsable(blueprint)) {
        urls.add(blueprint.thumbnail_url)
      }
    }
  }

  const allUrls = Array.from(urls)
  const boundedUrls =
    allUrls.length > MAX_BLUEPRINT_COUNT
      ? allUrls.slice(0, MAX_BLUEPRINT_COUNT)
      : allUrls
  if (boundedUrls.length < allUrls.length) {
    console.warn(
      `[pricelist-export] Distinct blueprint count (${allUrls.length}) exceeds the ` +
        `embed budget (${MAX_BLUEPRINT_COUNT}); only the first ${MAX_BLUEPRINT_COUNT} ` +
        "will be fetched — the rest render as blank PICTURE cells."
    )
  }

  let acceptedCount = 0
  let totalBytes = 0
  let rejectedByByteBudget = 0
  const validate = (buffer: Buffer): boolean => {
    if (!isPng(buffer)) return false
    if (totalBytes + buffer.length > MAX_TOTAL_BYTES) {
      rejectedByByteBudget++
      return false
    }
    acceptedCount++
    totalBytes += buffer.length
    return true
  }

  const results = await fetchImagePool(boundedUrls, {
    concurrency: FETCH_CONCURRENCY,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_DEADLINE_MS,
    validate,
    logLabel: "Blueprint",
  })

  console.log(
    `[pricelist-export] Embedded ${acceptedCount} blueprint(s), ${totalBytes} bytes total ` +
      `(of ${boundedUrls.length} distinct URL(s) attempted).`
  )
  if (rejectedByByteBudget > 0) {
    console.warn(
      `[pricelist-export] Blueprint byte budget (${MAX_TOTAL_BYTES} bytes) reached; ` +
        `${rejectedByByteBudget} otherwise-valid thumbnail(s) were skipped and render as ` +
        "blank PICTURE cells."
    )
  }

  return results
}
