import "server-only"

/**
 * A WritableCookieJar for Next.js middleware. Middleware cannot write cookies
 * through next/headers; it sets them on the NextResponse. And the render /
 * action that runs AFTER middleware in the same request reads the ORIGINAL
 * request cookies, so a refresh done in middleware must also be forwarded
 * downstream (`NextResponse.next({ request: { headers } })`), otherwise the
 * render sees no access token and the action would refresh a second time
 * with the already-rotated token.
 *
 * This jar records the writes; `forwardedCookieHeader` rebuilds the request
 * `cookie` header with them applied. Pure (no next/* import) so it is unit
 * tested; ./server.ts wires it to NextRequest / NextResponse.
 */
import type { V1CookieOptions, WritableCookieJar } from "./cookies"

export interface RecordedCookieWrite {
  name: string
  value: string
  options: V1CookieOptions
}

export interface RecordingCookieJar extends WritableCookieJar {
  writes(): RecordedCookieWrite[]
}

export function createRecordingCookieJar(
  read: (name: string) => string | undefined
): RecordingCookieJar {
  const writes: RecordedCookieWrite[] = []
  const overlay: Record<string, string | null> = {}
  return {
    get(name) {
      if (Object.prototype.hasOwnProperty.call(overlay, name)) {
        return overlay[name] ?? undefined
      }
      return read(name)
    },
    set(name, value, options) {
      writes.push({ name, value, options })
      overlay[name] = options.maxAge <= 0 || value === "" ? null : value
    },
    // Middleware can always write (onto the NextResponse).
    assertWritable() {},
    writes: () => writes.slice(),
  }
}

/**
 * Router prefetches (Next.js `next-router-prefetch`, the legacy
 * `x-middleware-prefetch`, browser `Purpose` / `Sec-Purpose: prefetch`).
 * Decision: a prefetch NEVER triggers a refresh — prefetches fire in bursts
 * for every visible link, their responses may be cached or discarded by the
 * router, and nothing is lost by rendering a prefetch as not-yet-authenticated
 * on v1; the real navigation then refreshes.
 */
export function isPrefetchRequest(headers: { get(name: string): string | null }): boolean {
  if (headers.get("next-router-prefetch") || headers.get("x-middleware-prefetch")) {
    return true
  }
  const purpose = `${headers.get("purpose") || ""} ${headers.get("sec-purpose") || ""}`
  return /\bprefetch\b/i.test(purpose)
}

/**
 * The request `cookie` header with `writes` applied (deleted cookies
 * removed, set cookies replaced or appended). Values are passed through
 * as-is (v1 tokens are base64url / JWT, cookie-safe).
 */
export function forwardedCookieHeader(
  original: string | null,
  writes: RecordedCookieWrite[]
): string {
  const order: string[] = []
  const values: Record<string, string | null> = {}
  ;(original || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const eq = part.indexOf("=")
      const name = eq === -1 ? part : part.slice(0, eq)
      if (!Object.prototype.hasOwnProperty.call(values, name)) order.push(name)
      values[name] = eq === -1 ? "" : part.slice(eq + 1)
    })
  writes.forEach((w) => {
    if (!Object.prototype.hasOwnProperty.call(values, w.name)) order.push(w.name)
    values[w.name] = w.options.maxAge <= 0 || w.value === "" ? null : w.value
  })
  return order
    .filter((name) => values[name] !== null)
    .map((name) => `${name}=${values[name]}`)
    .join("; ")
}
