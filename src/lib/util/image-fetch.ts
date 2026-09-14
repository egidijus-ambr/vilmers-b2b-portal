/**
 * Reusable bounded-concurrency image-fetch pool, extracted from
 * pricelist-photos.ts so pricelist-blueprints.ts (see that file) can reuse
 * the same worker/timeout/validation machinery instead of duplicating it.
 *
 * Every failure mode (network error, timeout, non-2xx, bytes that fail the
 * caller-supplied `validate`, or the overall deadline expiring with URLs
 * still unfetched) resolves to that URL being absent from — or mapped to
 * `null` in — the returned Map. This module NEVER throws: an image is
 * always allowed to degrade to "no image", never to fail the caller's
 * larger operation (see pricelist-workbook.ts's doc comments for why that
 * discipline matters for the pricelist export specifically).
 */

const LOG_PREFIX = "[pricelist-export]"

export interface ImagePoolConfig {
  /** Max simultaneous in-flight fetches. */
  concurrency: number
  /** Per-fetch abort timeout, in ms. */
  fetchTimeoutMs: number
  /**
   * Overall wall-clock budget for the whole pool, in ms. Once elapsed, no
   * NEW fetches are started — URLs not yet started are simply left out of
   * the result (callers already treat a missing entry as "no image", same
   * as `null`). Fetches already in flight are allowed to finish; this bounds
   * how long the pool keeps STARTING new work, not a hard kill switch.
   */
  deadlineMs: number
  /**
   * Returns true iff `buffer` is acceptable to embed. Called AFTER a
   * successful 2xx fetch. Returning false is treated exactly like a network
   * failure — the URL maps to `null`, never an error.
   *
   * Bookkeeping validators (e.g. blueprint budget/byte-cap enforcement in
   * pricelist-blueprints.ts) can close over mutable state here since this is
   * always invoked synchronously — no other pool code runs between the
   * check and any state mutation inside `validate`, so this is safe even
   * with concurrent workers.
   */
  validate: (buffer: Buffer) => boolean
  /** Used only in console.warn messages, e.g. "Photo" or "Blueprint". */
  logLabel: string
}

async function fetchOneImage(
  url: string,
  config: ImagePoolConfig
): Promise<Buffer | null> {
  try {
    // URLs can come out of the database/CDN with raw spaces (e.g. product
    // codes with " - " in the filename). encodeURI (NOT encodeURIComponent,
    // which would also escape "://") leaves the scheme/host intact while
    // escaping the parts that break an HTTP request line. Harmless no-op on
    // an already-clean URL (e.g. a GCS blueprint URL), so this is safe to
    // apply unconditionally for every caller of this pool.
    const response = await fetch(encodeURI(url), {
      signal: AbortSignal.timeout(config.fetchTimeoutMs),
    })
    if (!response.ok) {
      console.warn(
        `${LOG_PREFIX} ${config.logLabel} fetch failed (status ${response.status}): ${url}`
      )
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    if (!config.validate(buffer)) {
      console.warn(
        `${LOG_PREFIX} ${config.logLabel} failed validation, skipping: ${url}`
      )
      return null
    }
    return buffer
  } catch (error) {
    console.warn(`${LOG_PREFIX} ${config.logLabel} fetch failed: ${url}`, error)
    return null
  }
}

/**
 * Fetches every URL in `urls` with bounded concurrency, returning a
 * url -> buffer map (buffer is `null` when the fetch/validation failed for
 * that URL, and the key is simply absent if the pool's overall deadline hit
 * before that URL's fetch could even start).
 *
 * Dedupes are the CALLER's responsibility — pass a `Set`/pre-deduped array
 * in; this pool fetches exactly what it's given, once each, in the order
 * given.
 */
export async function fetchImagePool(
  urls: Iterable<string>,
  config: ImagePoolConfig
): Promise<Map<string, Buffer | null>> {
  const results = new Map<string, Buffer | null>()
  const queue = Array.from(urls)
  let next = 0
  const deadlineAt = Date.now() + config.deadlineMs
  let deadlineWarned = false

  async function worker() {
    while (next < queue.length) {
      if (Date.now() >= deadlineAt) {
        if (!deadlineWarned) {
          deadlineWarned = true
          console.warn(
            `${LOG_PREFIX} ${config.logLabel} fetch pool hit its ${config.deadlineMs}ms ` +
              `wall-clock deadline with ${queue.length - next} URL(s) still unfetched; ` +
              "those render as blank cells rather than blocking the export."
          )
        }
        return
      }
      const url = queue[next]
      next += 1
      results.set(url, await fetchOneImage(url, config))
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(config.concurrency, queue.length) }, worker)
  )

  return results
}
