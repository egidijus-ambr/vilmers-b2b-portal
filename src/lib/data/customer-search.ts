"use server"

import { sdk } from "@lib/config"
import { isAgentOrAdmin } from "@lib/util/roles"
import { retrieveCustomer } from "./customer"
import { getActingCustomer } from "./acting-customer"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"
import {
  mapV1ManagedCustomer,
  mapV1MeToActingCustomer,
} from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import {
  V1_MAX_PAGE_SIZE,
  runIdentityCall,
  v1GetMeActing,
  v1ListManagedCustomers,
} from "./me-v1"

/**
 * The agent's customer selector.
 *
 * Who may use it: unchanged portal rule, agent / admin only
 * (src/lib/util/roles.ts isAgentOrAdmin; the backend would also serve
 * managers, D9 — not enabled here).
 *
 *   v1 (2c-9): GET /me/managed-customers?search=&pageSize= (agents: their
 *     managed customers, portal admins: every live B2B customer; ordered by
 *     order count, then name). `ids` lookups (no such filter on v1) go
 *     through GET /me + X-Acting-Customer-Id per id (at most 10).
 *   v1 errors: thrown, so the selector shows its "could not load" + retry
 *     state, as on a GraphQL error. A v1 401 takes the GraphQL path.
 */
export async function searchCustomersForSelector(args: {
  query?: string
  limit?: number
  ids?: number[]
}): Promise<SearchCustomerResult[]> {
  const me = await retrieveCustomer()
  if (!me || !isAgentOrAdmin(me)) return []

  return runIdentityCall<SearchCustomerResult[]>("searchCustomersForSelector", {
    v1: async (bearer) => {
      if (args.ids && args.ids.length > 0) {
        const ids = args.ids
          .filter((id) => Number.isInteger(id) && id > 0 && id <= 2147483647)
          .slice(0, 10)
        const found = await Promise.all(
          ids.map(async (id) => {
            try {
              return mapV1MeToActingCustomer(await v1GetMeActing(bearer, id))
            } catch (error) {
              // Unknown / unmanaged: not in the result, as with GraphQL.
              if (isV1ProblemError(error) && (error.status === 404 || error.status === 403)) {
                return null
              }
              throw error
            }
          })
        )
        return found.filter((c): c is SearchCustomerResult => c !== null)
      }
      const search = (args.query ?? "").trim().slice(0, 200)
      const pageSize = Math.min(
        V1_MAX_PAGE_SIZE,
        Math.max(1, Math.floor(args.limit ?? 10))
      )
      const body = await v1ListManagedCustomers(bearer, {
        search: search || undefined,
        pageSize,
      })
      return (body.data ?? []).map(mapV1ManagedCustomer)
    },
    graphql: () => sdk.customer.searchCustomers(args),
    guest: () => [],
    onError: (error) => {
      throw error instanceof Error ? error : new Error("customer search failed")
    },
  })
}

/**
 * Re-read the acting customer from the session cookie (same resolver the
 * layout uses for `initialActingCustomer`). Lets a client tab resync after
 * the selection changed in another tab, and hydrates a freshly picked
 * selector row (on v1 the row is slim). Agents/admins only; never writes the
 * cookie (beyond clearing a stale one, as the resolver already does).
 */
export async function getActingCustomerForSelector(): Promise<
  { ok: true; customer: SearchCustomerResult | null } | { ok: false }
> {
  try {
    const me = await retrieveCustomer()
    if (!me || !isAgentOrAdmin(me)) return { ok: false }
    const acting = await getActingCustomer()
    return { ok: true, customer: (acting as SearchCustomerResult | null) ?? null }
  } catch (error) {
    console.error("[getActingCustomerForSelector] Failed to resolve acting customer:", error)
    return { ok: false }
  }
}
