import "server-only"

import { cookies } from "next/headers"
import { sdk } from "@lib/config"
import { ACTING_CUSTOMER_COOKIE } from "@lib/util/acting-customer-cookie"
import { isAgentOrAdmin } from "@lib/util/roles"
import { getManagerIdFromToken } from "@lib/util/jwt-utils"
import { getSessionCustomer } from "./session-customer"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import {
  isV1ImpersonationSession,
  mapV1MeToActingCustomer,
} from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { describeV1Error, runIdentityCall, v1GetAuthSession, v1GetMeActing } from "./me-v1"

/**
 * Returns true when the current session was initiated by a sales manager
 * impersonating from saas-admin-ui. Detected by the presence of a non-null
 * `managerId` field in the `_furni_jwt` cookie payload. Server-only.
 */
export async function isImpersonatedByManager(): Promise<boolean> {
  return runIdentityCall("isImpersonatedByManager", {
    // v1 sessions: the backend's own answer (GET /auth/session principal /
    // session kind), not a token decode. On any failure: the legacy decode
    // of the same browser's `_furni_jwt` (a UI flag only, never authz).
    v1: async (bearer) => isV1ImpersonationSession(await v1GetAuthSession(bearer)),
    graphql: impersonatedByManagerFromLegacyToken,
    guest: () => false,
    onError: impersonatedByManagerFromLegacyToken,
  })
}

async function impersonatedByManagerFromLegacyToken(): Promise<boolean> {
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
  const me = await getSessionCustomer()
  if (!me) return null

  // End-customers and any other non-elevated role just see themselves.
  if (!isAgentOrAdmin(me)) return me

  const storedId = await getActingCustomerId()
  if (storedId == null) return null

  return runIdentityCall<any | null>("getActingCustomer", {
    // GET /me + X-Acting-Customer-Id: the backend checks that this agent /
    // admin may act for the customer and returns its full profile (tags,
    // price lists, palettes, files, components), as searchCustomers({ids})
    // did. 404 = unknown / unmanaged / not live -> the cookie is stale.
    // 403 (acting refused, e.g. an impersonated session, D8) -> null,
    // cookie kept. Anything else (429 / 5xx / network) is THROWN, exactly as
    // a GraphQL searchCustomers failure is: callers tell "backend down"
    // from "no acting customer" (pricelist export 502 vs 409, the
    // selector's resync keeps its state).
    v1: async (bearer) => {
      if (storedId <= 0) return null
      try {
        return mapV1MeToActingCustomer(await v1GetMeActing(bearer, storedId))
      } catch (error) {
        if (isV1ProblemError(error) && error.status === 404) {
          await clearStaleActingCookie()
          return null
        }
        if (isV1ProblemError(error) && error.status === 403) return null
        throw error
      }
    },
    graphql: () => actingCustomerGraphql(storedId),
    guest: () => null,
    onError: (error) => {
      throw error instanceof Error
        ? error
        : new Error(`acting customer lookup failed: ${describeV1Error(error)}`)
    },
  })
}

async function clearStaleActingCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(ACTING_CUSTOMER_COOKIE)
  } catch {
    // Ignored: not in a mutating cookie context (server-component render).
  }
}

/** GraphQL path (legacy-only sessions; see v1-transport-rule.ts). */
async function actingCustomerGraphql(storedId: number): Promise<any | null> {
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
