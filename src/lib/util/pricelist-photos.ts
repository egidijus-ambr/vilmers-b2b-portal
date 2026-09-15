import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"
import { fetchImagePool } from "./image-fetch"
import { resizeForEmbed, type PricelistImage } from "./image-resize"
import { PHOTO_SIZE_PX } from "./pricelist-workbook"

// Resize target: 2x the actual on-screen display box (PHOTO_SIZE_PX, defined
// in pricelist-workbook.ts next to the embed's `ext`) on both axes — a
// retina-sharp source for the same visual footprint, same rationale and
// factor as pricelist-component-photos.ts's own resize target. A category
// photo was previously embedded at its full native 1080x1080 resolution to
// display in an ~85px box; resizing down to 170x170 cuts its embedded bytes
// roughly 6-8x with no visible quality loss at the size it's actually shown.
//
// UNLIKE pricelist-component-photos.ts, no trimming here — a category photo
// is a whole-product shot meant to show the piece in context, not a
// small item lost in a large background, so there's no equivalent problem
// to fix. Square box, matching PHOTO_SIZE_PX being a fixed square.
const RESIZE_BOX = { width: PHOTO_SIZE_PX * 2, height: PHOTO_SIZE_PX * 2 }

const FETCH_CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 10_000
// No overall wall-clock deadline existed before this file was refactored
// onto the shared pool (src/lib/util/image-fetch.ts) — category photos are a
// handful of distinct URLs at most (one per product, heavily deduped), so in
// practice this was never a real bound. Kept generous so it stays a no-op
// backstop rather than a behaviour change for the shipped JPEG path.
const FETCH_DEADLINE_MS = 60_000

// JPEG magic bytes (SOI marker). src_facebook is documented as uniformly
// JPEG, but this is a photo library fed by decades of uploads — checking
// the actual bytes rather than trusting the extension/URL means a
// mis-uploaded file degrades to "no photo" instead of handing ExcelJS a
// buffer it can't parse.
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

// Exported so pricelist-component-photos.ts can reuse the exact same
// validator for its own JPEG pool (src_facebook component photos) instead of
// duplicating the magic-byte check.
export function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= JPEG_MAGIC.length &&
    JPEG_MAGIC.every((byte, i) => buffer[i] === byte)
  )
}

/**
 * Fetches every distinct category-photo URL referenced by `products`, with
 * bounded concurrency, resizes each successfully-fetched JPEG down to
 * `RESIZE_BOX` (see that constant's doc comment), and returns a url ->
 * `PricelistImage` map (`null` when the fetch/validation failed for that
 * URL — see `resizeForEmbed`'s doc comment for what a non-null entry with
 * `width`/`height: null` means: sharp was unavailable or the resize itself
 * failed, and `buffer` is the ORIGINAL, un-resized fetch). Callers
 * (buildPricelistWorkbook) treat a missing/null MAP entry as "render 10
 * empty rows, no image" — never a reason to fail the export; a present
 * entry with unknown dimensions is a SEPARATE, still-renderable case (fixed
 * PHOTO_SIZE_PX square, see resolvePhotoExt).
 *
 * Dedupes by URL before fetching: many products share the same category
 * photo, and this is what keeps both the network work and the number of
 * embedded images down to the distinct-URL count rather than the
 * product count. Resizing likewise runs once per distinct URL, not once per
 * product.
 *
 * The fetch itself is a thin wrapper around the shared fetch pool (see
 * src/lib/util/image-fetch.ts, extracted from this file so
 * pricelist-blueprints.ts can reuse the same machinery); the resize step
 * runs as a second pass over that pool's results, same shape as
 * pricelist-component-photos.ts's own resize pass.
 */
export async function fetchPricelistPhotos(
  products: PricelistExportProduct[]
): Promise<Map<string, PricelistImage | null>> {
  const urls = new Set<string>()
  for (const product of products) {
    const url = product.advanced_product?.category_photo?.src_facebook
    if (url) urls.add(url)
  }

  const rawResults = await fetchImagePool(urls, {
    concurrency: FETCH_CONCURRENCY,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_DEADLINE_MS,
    validate: isJpeg,
    logLabel: "Photo",
  })

  const resized = new Map<string, PricelistImage | null>()
  await Promise.all(
    Array.from(rawResults.entries()).map(async ([url, buffer]) => {
      resized.set(url, buffer ? await resizeForEmbed(buffer, RESIZE_BOX) : null)
    })
  )
  return resized
}
