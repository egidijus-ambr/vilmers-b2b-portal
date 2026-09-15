import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"
import { fetchImagePool } from "./image-fetch"
import { isJpeg } from "./pricelist-photos"
import { collectComponentPhotoUrls, COMPONENT_PHOTO_BOX } from "./pricelist-workbook"
import { resizeForEmbed, type PricelistImage } from "./image-resize"

// Same concurrency/timeout profile as pricelist-photos.ts (JPEGs of the same
// origin/size class — src_facebook — unlike the much smaller PNG blueprints
// in pricelist-blueprints.ts, which can afford a higher concurrency).
const FETCH_CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 10_000
// Unlike pricelist-photos.ts's "a handful of distinct URLs at most" category
// photos, this pool can see hundreds of distinct component photos in one
// batch — measured 311 distinct URLs on a real priceListId=50 batch (147
// admitted products), fetched in ~2s at this concurrency/timeout — a real
// wall-clock budget matters here the same way it does for
// pricelist-blueprints.ts.
const FETCH_DEADLINE_MS = 45_000

// A shared "no photo" stock image assigned as a REAL Image row on many
// components (verified against local data: 59% of `model`-group links, 33%
// of `product-mattress`-group links carry this exact placeholder in both
// `src` and `src_facebook`). It exists to make the configurator/admin UI
// never show a broken-image icon — printing it into a customer-facing
// pricelist would read as a data error ("why does every chair have the same
// stock photo?"), not the deliberate "we don't have a real photo yet" state
// it actually represents. Skipped by URL pattern BEFORE the fetch pool even
// starts, so it also never eats into the byte/count budget below.
const PLACEHOLDER_URL_PATTERN = /image404/i

// Hard embed budget — same two-enforcement-point shape as
// pricelist-blueprints.ts's MAX_BLUEPRINT_COUNT/MAX_TOTAL_BYTES (COUNT
// truncates the URL list BEFORE any fetch starts; BYTES is checked inside
// `validate`, invoked synchronously per successful fetch, so it's race-free
// across concurrent workers — see fetchImagePool's own doc comment).
//
// COUNT is generous on purpose: 311 distinct URLs were measured on a real
// full batch, nowhere near this — it exists purely as a backstop against a
// pathological pricelist, same rationale as the blueprint pool's own count
// cap.
const MAX_COMPONENT_PHOTO_COUNT = 1000
// PRE-TRIM-AND-RESIZE byte budget — bounds how much RAW fetched JPEG this
// pool ever holds in memory at once (trimming/resizing run on already-
// fetched buffers, see the pass below), NOT the final embedded size. Before
// resizing existed at all, a 16MB cap here WAS the embedded-size budget and
// measurably bound on real data: of 311 distinct URLs on a real
// priceListId=50 batch, ~16.75-16.77MB of raw JPEG saturated that cap,
// dropping 1-2 otherwise-valid photos. Trimming+resizing shrinks that same
// batch by roughly two orders of magnitude before it ever reaches the
// workbook (see the resize pass's own doc comment for the current measured
// total) — so this is raised generously (48MB, comfortably above the
// ~16.8MB that same real batch's RAW fetches measured at) to guard peak
// memory during the fetch/trim/resize pass, not to ration which photos
// survive.
const MAX_TOTAL_BYTES = 48 * 1024 * 1024 // 48MB

// Resize target: 2x COMPONENT_PHOTO_BOX (the actual on-screen display box —
// see pricelist-workbook.ts), per axis, for a retina-sharp source at the
// same visual footprint, same rationale/factor as pricelist-photos.ts's own
// RESIZE_BOX. Non-square (170x130) because COMPONENT_PHOTO_BOX itself is
// (the full picture cell, not a square) — see that constant's doc comment.
const RESIZE_BOX = {
  width: COMPONENT_PHOTO_BOX.width * 2,
  height: COMPONENT_PHOTO_BOX.height * 2,
}

// Trims a uniform white/light-grey border from a component photo BEFORE
// resizing (see image-resize.ts's ResizeOptions.trimThreshold and
// resizeJpegForCell's doc comment for the sharp `trim()` mechanics and the
// untrimmed-retry fallback). Without this, a component whose actual item
// occupies a small fraction of its 1080x1080 `src_facebook` frame (verified
// against a real user report — a ~20px item in an otherwise-white photo)
// renders as a tiny, hard-to-see image inside its already-small cell — the
// user-visible bug this whole change fixes.
//
// Value 25 was checked against 6 real component photos pulled from a live
// priceListId=50 batch across a spread of shapes (a small pillow/bracket
// item trimming to ~18%x30% of its frame — visually confirmed to be the
// "hammer-shaped" item from the user's screenshot; a wider flat item at
// ~75%x23%; a full-bleed fabric-texture macro shot that trim correctly left
// almost untouched; a tall thin metal leg at ~16%x11%; and more) at
// thresholds 10/25/40/60 — the trimmed box varied by at most 1-2px across
// that whole range for every sample (i.e. none of these real photos have
// enough JPEG noise around their background for the threshold choice to
// matter), so 25 sits in the middle of a wide safe range rather than near an
// edge. None of the 6 samples hit the "trim finds nothing" failure path
// either — that fallback exists for a plain/blank photo this sample set
// didn't happen to include, not because it was observed.
const TRIM_THRESHOLD = 25

/**
 * Fetches every distinct component-photo URL that will actually be embedded
 * on an OTHER/OTHER_WITH_FABRICS sheet — see collectComponentPhotoUrls's doc
 * comment (in pricelist-workbook.ts) for why that set is derived from
 * buildComponentRows's own priced+enabled-group filter rather than every
 * enabled component association: most of a product's ~50+ components carry
 * no price at all, and fetching (and budget-charging) an image for one that
 * will never render a row would silently starve a component that DOES.
 *
 * Every successfully-fetched buffer has its white/light background trimmed
 * (see `TRIM_THRESHOLD`) and is then resized to `RESIZE_BOX` (see
 * resizeForEmbed/PricelistImage) BEFORE being returned — trimming is what
 * makes the item itself fill its cell instead of being a small shape lost
 * in a mostly-white square; resizing is what keeps the embedded workbook
 * size in the low single-digit MB instead of the ~17MB a full batch's RAW
 * fetches measure at (see MAX_TOTAL_BYTES's own doc comment).
 *
 * Mirrors fetchPricelistPhotos/fetchPricelistBlueprints exactly otherwise:
 * bounded concurrency, NEVER throws, and a missing/null map entry means "no
 * image for this component — render the shorter, image-less row height with
 * a blank PICTURE cell" and is never treated as an error by the caller (see
 * writeComponentDataRow).
 */
export async function fetchPricelistComponentPhotos(
  products: PricelistExportProduct[]
): Promise<Map<string, PricelistImage | null>> {
  const allUrls = Array.from(collectComponentPhotoUrls(products))

  let skippedAsPlaceholder = 0
  const candidateUrls = allUrls.filter((url) => {
    if (PLACEHOLDER_URL_PATTERN.test(url)) {
      skippedAsPlaceholder++
      return false
    }
    return true
  })

  const boundedUrls =
    candidateUrls.length > MAX_COMPONENT_PHOTO_COUNT
      ? candidateUrls.slice(0, MAX_COMPONENT_PHOTO_COUNT)
      : candidateUrls
  if (boundedUrls.length < candidateUrls.length) {
    console.warn(
      `[pricelist-export] Distinct component-photo count (${candidateUrls.length}) exceeds ` +
        `the embed budget (${MAX_COMPONENT_PHOTO_COUNT}); only the first ` +
        `${MAX_COMPONENT_PHOTO_COUNT} will be fetched — the rest render as blank PICTURE cells.`
    )
  }

  let acceptedCount = 0
  let totalRawBytes = 0
  let rejectedByByteBudget = 0
  const validate = (buffer: Buffer): boolean => {
    if (!isJpeg(buffer)) return false
    if (totalRawBytes + buffer.length > MAX_TOTAL_BYTES) {
      rejectedByByteBudget++
      return false
    }
    acceptedCount++
    totalRawBytes += buffer.length
    return true
  }

  const rawResults = await fetchImagePool(boundedUrls, {
    concurrency: FETCH_CONCURRENCY,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_DEADLINE_MS,
    validate,
    logLabel: "Component photo",
  })

  const resized = new Map<string, PricelistImage | null>()
  let totalResizedBytes = 0
  await Promise.all(
    Array.from(rawResults.entries()).map(async ([url, buffer]) => {
      if (!buffer) {
        resized.set(url, null)
        return
      }
      const image = await resizeForEmbed(buffer, RESIZE_BOX, { trimThreshold: TRIM_THRESHOLD })
      totalResizedBytes += image.buffer.length
      resized.set(url, image)
    })
  )

  // Gated on boundedUrls.length: a product batch with zero priced
  // OTHER/OTHER_WITH_FABRICS components (e.g. an all-sofa pricelist) is a
  // normal, expected outcome, not worth a log line every export.
  if (boundedUrls.length > 0) {
    console.log(
      `[pricelist-export] Embedded ${acceptedCount} component photo(s): ${totalRawBytes} raw bytes ` +
        `fetched, ${totalResizedBytes} bytes after resize (of ${boundedUrls.length} distinct ` +
        `URL(s) attempted; ${skippedAsPlaceholder} skipped as the shared image404 placeholder).`
    )
  }
  if (rejectedByByteBudget > 0) {
    console.warn(
      `[pricelist-export] Component-photo RAW byte budget (${MAX_TOTAL_BYTES} bytes) reached; ` +
        `${rejectedByByteBudget} otherwise-valid photo(s) were skipped and render as ` +
        "blank PICTURE cells at the shorter, image-less row height."
    )
  }

  return resized
}
