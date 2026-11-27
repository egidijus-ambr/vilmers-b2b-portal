// src/lib/util/show-all-products-gate.ts
//
// Pure decision for the "Show all products" override. Dependency-free on
// purpose so scripts/verify-show-all-products-gate.ts can exercise it without
// Next.js. The server wrapper lives in src/lib/data/show-all-products.ts.

/** The customer as the backend currently sees it (getMe), or null. */
export type BackendSessionCustomer = {
  id?: string | number | null
  role?: string | null
} | null | undefined

/** Impersonation claims decoded from the session token (see getImpersonationClaims). */
export type ImpersonationClaims = { customerId: number; managerId: number } | null

/**
 * True when the current session may use the "Show all products" toggle.
 *
 * - No backend customer (guest, invalid/expired token, backend down) -> false.
 *   This is the fail-closed path: the toggle is hidden and the cookie ignored.
 * - Backend role exactly 'admin' (portal Account Manager) -> true. The role is
 *   the database value returned by getMe, NOT the token claim, so a role
 *   change applies on the next request instead of on the next login.
 * - Admin-impersonation session -> true, but only when the backend accepted
 *   the token (sessionCustomer is non-null - the backend refuses impersonation
 *   tokens whose staff member was deleted/demoted/revoked) AND the customer it
 *   resolved is the one the token claims to impersonate.
 */
export function canUseShowAllProducts(
  sessionCustomer: BackendSessionCustomer,
  impersonation: ImpersonationClaims
): boolean {
  if (!sessionCustomer) return false

  if (sessionCustomer.role === "admin") return true

  if (impersonation) {
    const backendId = Number(sessionCustomer.id)
    return Number.isFinite(backendId) && backendId === impersonation.customerId
  }

  return false
}
