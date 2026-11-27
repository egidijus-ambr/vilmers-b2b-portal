// src/lib/data/show-all-products.ts
import { cache } from "react"
import { cookies } from "next/headers"
import { getImpersonationClaims } from "@lib/util/jwt-utils"
import { SHOW_ALL_PRODUCTS_COOKIE } from "@lib/util/show-all-products-cookie"
import { canUseShowAllProducts } from "@lib/util/show-all-products-gate"
import { getSessionCustomer } from "./session-customer"

/**
 * Reads the showAllProducts cookie. Returns true iff the cookie value is "1".
 * Server-only. Does NOT enforce the privilege gate — call canShowAllProductsToggle for that.
 */
export async function getShowAllProductsCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SHOW_ALL_PRODUCTS_COOKIE)?.value === "1"
}

/**
 * Decides whether the current user may use the override toggle, from the
 * backend's CURRENT view of the session (getMe), not from the token's role
 * claim — so a role change/revocation applies on the next request.
 *
 * True for:
 *   A) admin-impersonation sessions the backend accepted (token shape
 *      `customer_accountId: null, managerId: <staff id>`, getMe succeeded and
 *      resolved the customer the token names)
 *   B) Account Manager sessions (getMe role === 'admin', DB value)
 *
 * Fails closed: guest, invalid session or any getMe failure → false (toggle
 * hidden, cookie ignored). Request-scoped cached: layout, go-to-configurator
 * and getCustomerFilterData all hit this in one render.
 */
export const canShowAllProductsToggle = cache(async (): Promise<boolean> => {
  try {
    const customer = await getSessionCustomer()
    if (!customer) return false

    const token = (await cookies()).get("_furni_jwt")?.value
    const impersonation = token ? getImpersonationClaims(token) : null

    return canUseShowAllProducts(customer, impersonation)
  } catch {
    return false
  }
})

/**
 * True iff the gate passes AND the cookie is set. This is the boolean that
 * `getCustomerFilterData()` consults to decide whether to bypass filtering.
 */
export async function getShowAllProductsActive(): Promise<boolean> {
  const [allowed, on] = await Promise.all([
    canShowAllProductsToggle(),
    getShowAllProductsCookie(),
  ])
  return allowed && on
}
