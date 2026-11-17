import "server-only"

/**
 * Portal-side cookies of the v1 session (stage 2c-2, dormant: nothing in the
 * running portal reads or writes these yet).
 *
 * The backend sets its own refresh cookie (`__Secure-furni_refresh` /
 * `furni_refresh`, Path=/api/v1/auth) on the API origin; the portal never
 * relies on it reaching the browser. Per the backend's BFF contract
 * (furnisystems-backend src/api/v1/modules/auth/cookies.ts header comment,
 * docs/STAGE1_DEPLOY_NOTES.md "Stage 2 BFF requirements"), the BFF reads the
 * refresh token from the backend's Set-Cookie and keeps it in ITS OWN httpOnly
 * cookie on the portal origin. These are those cookies.
 *
 * Attributes mirror the existing `_furni_jwt` cookie (src/lib/data/cookies.ts
 * `setAuthToken`): httpOnly, SameSite=Strict, Secure in production. Path is
 * "/" (not the backend's /api/v1/auth): middleware, server actions and route
 * handlers on every portal path must see them.
 *
 * Pure and edge-safe: no next/* import, no Buffer, no node:crypto.
 */
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "../auth-constants"

/** v1 access token (Bearer for /api/v1, 1 h by default on the backend). */
export const V1_ACCESS_COOKIE = "_furni_v1_access"
/** v1 refresh token (opaque, rotated on every refresh). */
export const V1_REFRESH_COOKIE = "_furni_v1_refresh"

export const V1_COOKIE_PATH = "/"

/**
 * Write probe (see WritableCookieJar.assertWritable): a deletion of this
 * never-set cookie is written before any rotation request, so a call from a
 * server-component render throws BEFORE the backend commits a rotation.
 */
export const V1_WRITE_PROBE_COOKIE = "_furni_v1_probe"

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
  sameSite: "strict"
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
    sameSite: "strict",
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
