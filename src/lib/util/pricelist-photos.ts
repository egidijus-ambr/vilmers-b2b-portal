import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"

const FETCH_CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 10_000

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
 * Fetches one product photo. Returns `null` on ANY failure (network error,
 * timeout, non-2xx status, or bytes that aren't actually a JPEG) — never
 * throws. A decorative photo is not worth failing the export over; see
 * fetchPricelistPhotos below.
 */
async function fetchOnePhoto(url: string): Promise<Buffer | null> {
  try {
    // URLs come out of the database with raw spaces (e.g. product codes
    // with " - " in the filename). encodeURI (NOT encodeURIComponent, which
    // would also escape "://") leaves the scheme/host intact while escaping
    // the parts that break an HTTP request line.
    const response = await fetch(encodeURI(url), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.warn(
        `[pricelist-export] Photo fetch failed (status ${response.status}): ${url}`
      )
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!isJpeg(buffer)) {
      console.warn(
        `[pricelist-export] Photo is not a JPEG, skipping: ${url}`
      )
      return null
    }
    return buffer
  } catch (error) {
    console.warn(`[pricelist-export] Photo fetch failed: ${url}`, error)
    return null
  }
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
 */
export async function fetchPricelistPhotos(
  products: PricelistExportProduct[]
): Promise<Map<string, Buffer | null>> {
  const urls = new Set<string>()
  for (const product of products) {
    const url = product.advanced_product?.category_photo?.src_facebook
    if (url) urls.add(url)
  }

  const results = new Map<string, Buffer | null>()
  const queue = Array.from(urls)
  let next = 0

  async function worker() {
    while (next < queue.length) {
      const url = queue[next]
      next += 1
      results.set(url, await fetchOnePhoto(url))
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, queue.length) }, worker)
  )

  return results
}
