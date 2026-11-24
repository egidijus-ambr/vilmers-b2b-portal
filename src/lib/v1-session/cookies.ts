import "server-only"

/**
 * Portal-side cookies of the v1 session (live since stage 2c-3).
 *
 * The backend sets its own refresh cookie (`__Secure-furni_refresh` /
 * `furni_refresh`, Path=/api/v1/auth) on the API origin; the portal never
 * relies on it reaching the browser. Per the backend's BFF contract
 * (furnisystems-backend src/api/v1/modules/auth/cookies.ts header comment,
 * docs/STAGE1_DEPLOY_NOTES.md "Stage 2 BFF requirements"), the BFF reads the
 * refresh token from the backend's Set-Cookie and keeps it in ITS OWN httpOnly
 * cookie on the portal origin. These are those cookies.
 *
 * Names and attributes (stage 2c-3, owner decision 2026-11-23):
 *
 *   cookie   secure (NODE_ENV=production)   otherwise (local http)
 *   access   __Host-furni_v1_access         _furni_v1_access
 *   refresh  __Host-furni_v1_refresh        _furni_v1_refresh
 *   probe    __Host-furni_v1_probe          _furni_v1_probe
 *
 *   HttpOnly; Secure (when secure); SameSite=Lax; Path=/; NO Domain.
 *
 * Lax, not Strict: the magic-link click from an email is a cross-site
 * top-level GET and must arrive with the session visible. `_furni_jwt` is
 * written Lax too (src/lib/data/cookies.ts setAuthToken), so the two sessions
 * behave the same on such an arrival; the middleware's orphan rule depends on
 * that (src/middleware.ts).
 *
 * The names are ALWAYS derived from the same `secure` flag as the Secure
 * attribute (v1CookieNames(secure) + v1CookieOptions(secure, ...)): a
 * `__Host-` cookie without Secure is silently dropped by browsers, so the
 * login would look successful and then vanish.
 *
 * Pure and edge-safe: no next/* import, no Buffer, no node:crypto.
 */
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "../auth-constants"

export interface V1CookieNames {
  /** v1 access token (Bearer for /api/v1, 1 h by default on the backend). */
  access: string
  /** v1 refresh token (opaque, rotated on every refresh). */
  refresh: string
  /**
   * Write probe (see WritableCookieJar.assertWritable): a deletion of this
   * never-set cookie is written before any rotation request, so a call from a
   * server-component render throws BEFORE the backend commits a rotation.
   */
  probe: string
}

const SECURE_NAMES: V1CookieNames = Object.freeze({
  access: "__Host-furni_v1_access",
  refresh: "__Host-furni_v1_refresh",
  probe: "__Host-furni_v1_probe",
})

const LOCAL_NAMES: V1CookieNames = Object.freeze({
  access: "_furni_v1_access",
  refresh: "_furni_v1_refresh",
  probe: "_furni_v1_probe",
})

/** Cookie names for the given Secure flag (see the table above). */
export function v1CookieNames(secure: boolean): V1CookieNames {
  return secure ? SECURE_NAMES : LOCAL_NAMES
}

/**
 * Secure attribute (and therefore the `__Host-` names): same rule as
 * setAuthToken (src/lib/data/cookies.ts). Pure, so render code can use it.
 */
export function v1CookiesSecure(): boolean {
  return process.env.NODE_ENV === "production"
}

export const V1_COOKIE_PATH = "/"

/**
 * The access cookie dies up to this many seconds before the token itself
 * (at most half the token's lifetime, so the cookie never gets maxAge 0),
 * so a present access cookie still has life left when the request reaches
 * the backend.
 */
export const ACCESS_EXPIRY_SKEW_SECONDS = 60

/**
 * The render-side check against the token's own `exp` only rejects tokens
 * this close to expiry; the earlier cut-off is the cookie's maxAge.
 */
export const ACCESS_EXP_MARGIN_SECONDS = 5

/** maxAge of the access cookie for a token living `expiresIn` seconds (>= 1). */
export function accessCookieMaxAge(expiresIn: number): number {
  const skew = Math.min(ACCESS_EXPIRY_SKEW_SECONDS, Math.floor(expiresIn / 2))
  return Math.max(1, Math.floor(expiresIn) - skew)
}

/** Refresh cookie lifetime cap: the existing 14-day portal cap, unchanged. */
export const V1_REFRESH_MAX_AGE_CAP_SECONDS = AUTH_COOKIE_MAX_AGE_SECONDS

export interface V1CookieOptions {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: string
  maxAge: number
}

export function v1CookieOptions(
  secure: boolean,
  maxAgeSeconds: number
): V1CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: V1_COOKIE_PATH,
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  }
}

/** Read side of a cookie store: all a server-component render may touch. */
export interface ReadonlyCookieJar {
  get(name: string): string | undefined
}

/**
 * Write side. Only middleware, server actions and route handlers can supply
 * one (Next.js rejects cookie writes during a server-component render).
 */
export interface WritableCookieJar extends ReadonlyCookieJar {
  set(name: string, value: string, options: V1CookieOptions): void
  /**
   * Throws V1CookiesNotWritableError when cookies cannot be written here
   * (a server-component render). Called before every rotation request.
   */
  assertWritable(): void
}

/** A rotation was attempted where cookies cannot be written (render). */
export class V1CookiesNotWritableError extends Error {
  constructor() {
    super(
      "v1 session: cookies are not writable here (server-component render?); refresh only in middleware, server actions or route handlers"
    )
    this.name = "V1CookiesNotWritableError"
  }
}
