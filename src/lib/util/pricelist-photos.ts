import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"
import { fetchImagePool } from "./image-fetch"
import {
  resizeForEmbed,
  isSharpAvailable,
  TRIM_THRESHOLD,
  type PricelistImage,
} from "./image-resize"
import { isEmbeddableSourceImage, isJpeg } from "./image-magic"
import { CATEGORY_HEADER_PHOTO_BOX, resolveCategoryPhotoUrls } from "./pricelist-workbook"

// Resize target: 2x the actual on-screen display box (CATEGORY_HEADER_PHOTO_BOX,
// defined in pricelist-workbook.ts next to the embed's `ext`), per axis — a
// retina-sharp source for the same visual footprint, same rationale and
// factor as pricelist-component-photos.ts's own resize target. A category
// photo was previously embedded at its full native 1080x1080 resolution to
// display in an ~85px square; it's now a much bigger (328x184) hero photo,
// but still resized down (rather than embedded at native src_lg resolution,
// ~2000x1419) for the exact same byte-saving reason.
const RESIZE_BOX = {
  width: CATEGORY_HEADER_PHOTO_BOX.width * 2,
  height: CATEGORY_HEADER_PHOTO_BOX.height * 2,
}

const FETCH_CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 10_000
// No overall wall-clock deadline existed before this file was refactored
// onto the shared pool (src/lib/util/image-fetch.ts) — category photos are a
// handful of distinct URLs at most (one per product, heavily deduped), so in
// practice this was never a real bound. Kept generous so it stays a no-op
// backstop rather than a behaviour change for the shipped JPEG path. Applies
// PER ROUND (see fetchPricelistPhotos's own doc comment) — a worst case of 3
// rounds (src_lg, src, src_facebook) could in theory take up to 3x this, but
// every round after the first only re-fetches candidates for products whose
// EARLIER candidate already failed, which in practice is a small minority.
const FETCH_DEADLINE_MS = 60_000

// PRE-RESIZE byte budget, same two-enforcement-point shape and same
// rationale as pricelist-component-photos.ts's own MAX_TOTAL_BYTES (bounds
// peak memory across every round's raw fetches, not the final embedded
// size — trimming+resizing already keeps the embedded total in the low
// single-digit MB, see this pool's own measured numbers). 32MB is
// comfortably above what a full real batch's category photos measure at
// (142 distinct src_lg URLs, ~35-150KB each — well under 10MB raw even
// before any candidate-fallback retries), so — like the blueprint pool's
// own cap — this is a backstop against a pathological batch, not expected
// to bind in practice.
const MAX_TOTAL_BYTES = 32 * 1024 * 1024 // 32MB

/**
 * Fetches every distinct header-photo URL referenced by `products`, trying
 * each product's candidates in `resolveCategoryPhotoUrls` order (`src_lg` ->
 * `src` -> `src_facebook`, or just `src_facebook` when sharp is
 * unavailable — see that function's own doc comment) until one FETCHES AND
 * VALIDATES successfully, rather than only ever trying the single
 * most-preferred URL. A real candidate can fail at fetch time independently
 * of how good a source it would have been (verified against live PL50
 * data: `ALVAR - ALVAR-src_lg.webp` 403s) — HEAD (before `src_lg` existed)
 * would have embedded that product's `src_facebook` just fine, so silently
 * giving up the moment the preferred candidate fails would be a real
 * regression, not a neutral trade-off.
 *
 * Implemented as ROUNDS, one per candidate POSITION (index 0, 1, 2 — at
 * most 3, since that's the longest any product's candidate list ever is):
 * round `r` fetches the distinct set of "position `r`" URLs for every
 * product whose candidates at positions `< r` have ALL already been
 * attempted and resolved to `null` (i.e. every earlier, more-preferred
 * candidate for that product failed) — a product whose candidate at an
 * earlier position already SUCCEEDED never reaches a later round at all,
 * and a URL already attempted in an earlier round (whether it succeeded or
 * failed) is never re-fetched even if a DIFFERENT product reaches it as a
 * later-position candidate. This keeps both the "don't fetch the second
 * candidate when the first succeeded" and the "dedupe by URL across
 * products" requirements true across the WHOLE batch, not just within one
 * product's own candidate list.
 *
 * Each round resizes its own successfully-fetched buffers (`resizeForEmbed`,
 * with the same `TRIM_THRESHOLD` the component-photo pool uses — see that
 * constant's own doc comment) before moving to the next round; a missing/
 * null MAP entry for a given URL means "this candidate didn't work out" and
 * is never an error on its own — see `buildPricelistWorkbook`'s own doc
 * comment for how the embed side reads this same map with the same
 * candidate-list fallback. A present entry with unknown dimensions
 * (`resizeForEmbed` returned a resize-failure fallback) is a SEPARATE,
 * still-sometimes-renderable case — see `resolveHeaderPhotoExt`.
 *
 * `sharp` availability is checked ONCE, before any candidate list is even
 * built (see `isSharpAvailable`'s own doc comment for why this is memoised
 * at process scope) — without sharp there is no way to decode a WEBP
 * `src_lg` or convert a mixed-format `src` into something ExcelJS can
 * embed, so every product's candidate list is just `[src_facebook]` in
 * that case, and validation is just as strict (`isJpeg`, not the wider
 * `isEmbeddableSourceImage`) — there is no format this pool could ever
 * legitimately accept here that isn't already a JPEG.
 */
export async function fetchPricelistPhotos(
  products: PricelistExportProduct[]
): Promise<Map<string, PricelistImage | null>> {
  const sharpAvailable = await isSharpAvailable()

  const candidateListsByProduct = products
    .map((product) =>
      resolveCategoryPhotoUrls(product.advanced_product?.category_photo, sharpAvailable)
    )
    .filter((candidates) => candidates.length > 0)

  const resultsByUrl = new Map<string, PricelistImage | null>()
  const maxCandidateCount = candidateListsByProduct.reduce(
    (max, candidates) => Math.max(max, candidates.length),
    0
  )

  let totalRawBytes = 0
  let acceptedCount = 0
  let rejectedByByteBudget = 0
  const validate = (buffer: Buffer): boolean => {
    if (!(sharpAvailable ? isEmbeddableSourceImage(buffer) : isJpeg(buffer))) return false
    if (totalRawBytes + buffer.length > MAX_TOTAL_BYTES) {
      rejectedByByteBudget++
      return false
    }
    acceptedCount++
    totalRawBytes += buffer.length
    return true
  }

  for (let round = 0; round < maxCandidateCount; round++) {
    const urlsThisRound = new Set<string>()
    for (const candidates of candidateListsByProduct) {
      if (round >= candidates.length) continue // this product has no candidate at this position
      const alreadyResolved = candidates
        .slice(0, round)
        .some((url) => resultsByUrl.get(url))
      if (alreadyResolved) continue // an earlier, more-preferred candidate already worked
      const url = candidates[round]
      if (!resultsByUrl.has(url)) urlsThisRound.add(url) // not attempted in an earlier round either
    }
    if (urlsThisRound.size === 0) continue

    const rawResults = await fetchImagePool(urlsThisRound, {
      concurrency: FETCH_CONCURRENCY,
      fetchTimeoutMs: FETCH_TIMEOUT_MS,
      deadlineMs: FETCH_DEADLINE_MS,
      validate,
      logLabel: "Photo",
    })

    await Promise.all(
      Array.from(rawResults.entries()).map(async ([url, buffer]) => {
        resultsByUrl.set(
          url,
          buffer ? await resizeForEmbed(buffer, RESIZE_BOX, { trimThreshold: TRIM_THRESHOLD }) : null
        )
      })
    )
  }

  console.log(
    `[pricelist-export] Category header photos: ${acceptedCount} distinct URL(s) fetched OK ` +
      `(${totalRawBytes} raw bytes), ${resultsByUrl.size} distinct URL(s) attempted total ` +
      `across ${maxCandidateCount} candidate round(s).`
  )
  if (rejectedByByteBudget > 0) {
    console.warn(
      `[pricelist-export] Category-photo byte budget (${MAX_TOTAL_BYTES} bytes) reached; ` +
        `${rejectedByByteBudget} otherwise-valid photo(s) were skipped.`
    )
  }

  return resultsByUrl
}
