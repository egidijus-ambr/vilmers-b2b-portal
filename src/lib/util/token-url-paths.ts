// Pages whose URL carries a credential (stage 2c-3). Pure and import-free:
// used by the edge middleware and by server layouts.
//
//   /<lang>/auth/magic-link?token=<magic-link token>     (v1 opaque or legacy JWT)
//   /<lang>/auth/impersonate?token=<impersonation JWT>   (GraphQL, until 2c-4)
//   /<lang>/auth/impersonation#code=...                  (2c-4 v1 landing, planned)
//
// Third-party scripts that record location.href (Tawk.to) must never load on
// them, and they are served with Referrer-Policy: no-referrer + no-store.
// Matches with or without the locale prefix, case-insensitively.

/** Every landing whose URL carries a token or code. */
export const TOKEN_URL_PATH =
  /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/auth\/(?:magic-link|impersonate|impersonation)(?:\/|$)/i

/**
 * True when `pathname` is (or percent-decodes to) a token landing. A
 * malformed encoding counts as one (fail closed).
 */
export function isTokenUrlPath(pathname: string): boolean {
  if (TOKEN_URL_PATH.test(pathname)) return true
  try {
    return TOKEN_URL_PATH.test(decodeURIComponent(pathname))
  } catch {
    return true
  }
}

/**
 * True when third-party scripts may load for `pathname` (the middleware's
 * `x-pathname` request header). Fails closed: no pathname means no script
 * (every page under a supported locale gets the header from the middleware;
 * anything else is redirected before it renders).
 */
export function thirdPartyScriptsAllowed(pathname: string | null | undefined): boolean {
  return !!pathname && !isTokenUrlPath(pathname)
}
