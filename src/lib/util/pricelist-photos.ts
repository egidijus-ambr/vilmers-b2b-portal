import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"
import { fetchImagePool } from "./image-fetch"

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

function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= JPEG_MAGIC.length &&
    JPEG_MAGIC.every((byte, i) => buffer[i] === byte)
  )
}

/**
 * Fetches every distinct category-photo URL referenced by `products`, with
 * bounded concurrency, and returns a url -> buffer map (buffer is `null`
 * when the fetch/validation failed for that URL). Callers (buildPricelistWorkbook)
 * treat a missing/null entry as "render 10 empty rows, no image" — never a
 * reason to fail the export.
 *
 * Dedupes by URL before fetching: many products share the same category
 * photo, and this is what keeps both the network work and the number of
 * embedded images down to the distinct-URL count rather than the
 * product count.
 *
 * This is a thin wrapper around the shared fetch pool (see
 * src/lib/util/image-fetch.ts, extracted from this file so
 * pricelist-blueprints.ts can reuse the same machinery) — the public
 * signature is unchanged from before that extraction, so route.ts's call
 * site didn't need to change.
 */
export async function fetchPricelistPhotos(
  products: PricelistExportProduct[]
): Promise<Map<string, Buffer | null>> {
  const urls = new Set<string>()
  for (const product of products) {
    const url = product.advanced_product?.category_photo?.src_facebook
    if (url) urls.add(url)
  }

  return fetchImagePool(urls, {
    concurrency: FETCH_CONCURRENCY,
    fetchTimeoutMs: FETCH_TIMEOUT_MS,
    deadlineMs: FETCH_DEADLINE_MS,
    validate: isJpeg,
    logLabel: "Photo",
  })
}
