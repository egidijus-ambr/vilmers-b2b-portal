// src/lib/data/show-all-products.ts
import { cookies } from "next/headers"
import {
  getManagerIdFromToken,
  getRoleFromToken,
} from "@lib/util/jwt-utils"
import { SHOW_ALL_PRODUCTS_COOKIE } from "@lib/util/show-all-products-cookie"

/**
 * Reads the showAllProducts cookie. Returns true iff the cookie value is "1".
 * Server-only. Does NOT enforce the privilege gate — call canShowAllProductsToggle for that.
 */
export async function getShowAllProductsCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SHOW_ALL_PRODUCTS_COOKIE)?.value === "1"
}

/**
 * Reads the auth JWT and decides whether the current user is allowed to use
 * the override toggle.
 *
 * Returns true for:
 *   A) admin-impersonator sessions (jwt.managerId != null)
 *   B) Account Manager sessions  (jwt.role === 'admin')
 *
 * False for everyone else (regular customers, agents).
 */
export async function canShowAllProductsToggle(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("_furni_jwt")?.value
  if (!token) return false

  if (getManagerIdFromToken(token) != null) return true
  if (getRoleFromToken(token) === "admin") return true
  return false
}

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
