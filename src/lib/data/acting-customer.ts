import "server-only"

import { cookies } from "next/headers"
import { sdk } from "@lib/config"
import { ACTING_CUSTOMER_COOKIE } from "@lib/util/acting-customer-cookie"
import { isAgentOrAdmin } from "@lib/util/roles"
import { getManagerIdFromToken } from "@lib/util/jwt-utils"
import { retrieveCustomer } from "./customer"

/**
 * Returns true when the current session was initiated by a sales manager
 * impersonating from saas-admin-ui. Detected by the presence of a non-null
 * `managerId` field in the `_furni_jwt` cookie payload. Server-only.
 */
export async function isImpersonatedByManager(): Promise<boolean> {
  const token = (await cookies()).get("_furni_jwt")?.value
  if (!token) return false
  return getManagerIdFromToken(token) != null
}

/**
 * Read the acting-customer cookie and return its parsed numeric id, or null
 * if the cookie is missing or malformed. Server-only.
 */
export async function getActingCustomerId(): Promise<number | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(ACTING_CUSTOMER_COOKIE)
  if (!cookie) return null
  const n = Number(cookie.value)
  return Number.isFinite(n) && Number.isInteger(n) ? n : null
}

/**
 * Resolve the customer in scope for the current request.
 *
 * Returns:
 *  - guest                                  → null
 *  - end-customer (logged in)               → the logged-in customer (passthrough)
 *  - agent/admin without cookie             → null
 *  - agent/admin with valid cookie          → hydrated customer from searchCustomers
 *  - agent/admin with stale (unknown) cookie → null (cookie cleared where allowed)
 *
 * The return type is intentionally loose: depending on the path it's either
 * an `ExtendedStoreCustomer` (from retrieveCustomer) or a slimmer
 * `SearchCustomerResult` (from sdk.customer.searchCustomers). Downstream
 * callers only consume a small intersection of fields (`id`, `price_listId`,
 * `tags`, `role`).
 */
export async function getActingCustomer(): Promise<any | null> {
  const me = await retrieveCustomer()
  if (!me) return null

  // End-customers and any other non-elevated role just see themselves.
  if (!isAgentOrAdmin(me)) return me

  const storedId = await getActingCustomerId()
  if (storedId == null) return null

  const results = await sdk.customer.searchCustomers({ ids: [storedId] })
  if (results.length === 0) {
    // Cookie points at a customer that no longer matches; try to clear it.
    // `cookies()` is read-only inside Server Components in Next.js 15 and
    // throws when mutated outside a Server Action / Route Handler. Wrap the
    // delete so a stale cookie in a server-component context degrades to a
    // simple `null` for this render. The next client-driven selector action
    // will reliably overwrite the cookie.
    try {
      const cookieStore = await cookies()
      cookieStore.delete(ACTING_CUSTOMER_COOKIE)
    } catch {
      // Ignored: not in a mutating cookie context.
    }
    return null
  }

  return results[0]
}
