import "server-only"

/**
 * Reads the rotated refresh token from a backend response's Set-Cookie.
 *
 * The backend sends the refresh token ONLY as a cookie — the JSON bodies of
 * /auth/refresh, /auth/magic-link/verify, /auth/impersonation/exchange and
 * /auth/staff/login carry no `refreshToken` field (furnisystems-backend
 * src/api/v1/modules/auth/schemas.ts TokenPairSchema / RefreshResponseSchema).
 * Cookie names per src/api/v1/modules/auth/cookies.ts: `__Secure-furni_refresh`
 * when the backend runs in production, `furni_refresh` otherwise. Both are
 * accepted: the backend's notion of "production" need not match the portal's
 * NODE_ENV.
 *
 * Pure and edge-safe.
 */

export const BACKEND_REFRESH_COOKIE_NAMES = [
  "__Secure-furni_refresh",
  "furni_refresh",
]

export interface BackendRefreshCookie {
  token: string
  /** Max-Age in seconds (or derived from Expires); null when neither is sent. */
  maxAgeSeconds: number | null
}

/** All Set-Cookie values of a response, with a fallback for old runtimes. */
export function setCookieValues(headers: Headers): string[] {
  const withGetter = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof withGetter.getSetCookie === "function") {
    return withGetter.getSetCookie()
  }
  const joined = headers.get("set-cookie")
  return joined ? splitJoinedSetCookie(joined) : []
}

/**
 * Splits a comma-joined Set-Cookie header. A comma separates two cookies only
 * when it is followed by `name=`; commas inside `Expires=Wed, 21 Oct ...` are
 * kept.
 */
export function splitJoinedSetCookie(joined: string): string[] {
  return joined
    .split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * The backend refresh cookie in `values`, or null when absent. A clearing
 * cookie (empty value or Max-Age<=0) is not a token and yields null.
 */
export function findBackendRefreshCookie(
  values: string[],
  nowMs: number = Date.now()
): BackendRefreshCookie | null {
  for (let i = 0; i < values.length; i++) {
    const parsed = parseSetCookie(values[i])
    if (!parsed) continue
    if (BACKEND_REFRESH_COOKIE_NAMES.indexOf(parsed.name) === -1) continue
    if (!parsed.value) continue

    let maxAgeSeconds: number | null = null
    const maxAge = parsed.attributes["max-age"]
    if (maxAge !== undefined && /^-?\d+$/.test(maxAge)) {
      maxAgeSeconds = parseInt(maxAge, 10)
    } else if (parsed.attributes.expires !== undefined) {
      const at = Date.parse(parsed.attributes.expires)
      if (!isNaN(at)) maxAgeSeconds = Math.floor((at - nowMs) / 1000)
    }
    if (maxAgeSeconds !== null && maxAgeSeconds <= 0) continue
    return { token: parsed.value, maxAgeSeconds }
  }
  return null
}

function parseSetCookie(raw: string): {
  name: string
  value: string
  attributes: Record<string, string>
} | null {
  const segments = raw.split(";")
  const first = segments[0]
  const eq = first.indexOf("=")
  if (eq <= 0) return null
  const name = first.slice(0, eq).trim()
  let value = first.slice(eq + 1).trim()
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    value = value.slice(1, -1)
  }
  try {
    value = decodeURIComponent(value)
  } catch {
    // Not percent-encoded; keep as is (base64url tokens never need decoding).
  }
  const attributes: Record<string, string> = {}
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const at = seg.indexOf("=")
    const key = (at === -1 ? seg : seg.slice(0, at)).trim().toLowerCase()
    if (!key) continue
    attributes[key] = at === -1 ? "" : seg.slice(at + 1).trim()
  }
  return { name, value, attributes }
}
