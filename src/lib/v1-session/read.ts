import "server-only"

/**
 * Render-safe read of the v1 session. Takes only a ReadonlyCookieJar, never
 * performs a network call, never refreshes, never writes a cookie: safe in a
 * server component. This module deliberately imports nothing from
 * ./refresh (the verify script asserts that).
 *
 * A render that finds `needs-refresh` must treat the request as not
 * (yet) authenticated on v1 — the refresh happens in middleware / a server
 * action / a route handler (see ./refresh `ensureFreshV1Session`).
 */
import {
  ACCESS_EXP_MARGIN_SECONDS,
  v1CookieNames,
  type ReadonlyCookieJar,
} from "./cookies"

export type V1SessionRead =
  /**
   * A usable access token: the cookie is present (its maxAge already ends
   * up to 60 s before the token) and the token is not within 5 s of `exp`.
   */
  | { status: "ok"; accessToken: string; expiresAtMs: number | null }
  /** No usable access token, but a refresh token: refresh where cookies can be written. */
  | { status: "needs-refresh" }
  /** Neither cookie: no v1 session. */
  | { status: "anonymous" }

/** `secure` selects the cookie names (see ./cookies v1CookieNames). */
export function readV1Session(
  jar: ReadonlyCookieJar,
  secure: boolean,
  nowMs: number = Date.now()
): V1SessionRead {
  const names = v1CookieNames(secure)
  const accessToken = jar.get(names.access) || undefined
  const refreshToken = jar.get(names.refresh) || undefined

  if (accessToken) {
    const expMs = jwtExpiryMs(accessToken)
    const fresh =
      expMs === null || expMs - ACCESS_EXP_MARGIN_SECONDS * 1000 > nowMs
    if (fresh) {
      return { status: "ok", accessToken, expiresAtMs: expMs }
    }
  }
  return refreshToken ? { status: "needs-refresh" } : { status: "anonymous" }
}

/**
 * `exp` of a JWT in ms, or null when it cannot be read. NOT a verification:
 * the backend verifies every access token; this only decides whether the
 * cookie is worth sending. Edge-safe (atob, no Buffer).
 */
export function jwtExpiryMs(token: string): number | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64 + "===".slice((b64.length + 3) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: unknown }
    return typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null
  } catch {
    return null
  }
}
