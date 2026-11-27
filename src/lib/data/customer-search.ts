"use server"

import { sdk } from "@lib/config"
import { isAgentOrAdmin } from "@lib/util/roles"
import { retrieveCustomer } from "./customer"
import { getActingCustomer } from "./acting-customer"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"
import {
  mapV1ManagedCustomer,
  mapV1ManagedCustomerDetailed,
} from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import {
  V1_MAX_PAGE_SIZE,
  runIdentityCall,
  v1ListManagedCustomers,
  v1ManagedCustomersByIds,
} from "./me-v1"

/** Today's cap of an `ids` lookup (the backend allows 20 with detail). */
const SELECTOR_MAX_IDS = 10

/**
 * The agent's customer selector.
 *
 * Who may use it: unchanged portal rule, agent / admin only
 * (src/lib/util/roles.ts isAgentOrAdmin; the backend would also serve
 * managers, D9 — not enabled here).
 *
 *   v1 (2c-9): GET /me/managed-customers?search=&pageSize= (agents: their
 *     managed customers, portal admins: every live B2B customer; ordered by
 *     order count, then name). `ids` lookups (at most 10, de-duplicated):
 *     ONE GET /me/managed-customers?ids=...&expand=detail (each row hydrated
 *     like GET /me + X-Acting-Customer-Id), in the order of `ids`; ids the
 *     caller may not act for are absent, as with GraphQL. A 403 (e.g. an
 *     impersonated session: no acting) is [], as the per-id lookups gave.
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
        const ids = Array.from(
          new Set(
            args.ids.filter((id) => Number.isInteger(id) && id > 0 && id <= 2147483647)
          )
        ).slice(0, SELECTOR_MAX_IDS)
        if (ids.length === 0) return []
        let rows
        try {
          rows = (await v1ManagedCustomersByIds(bearer, ids)).data ?? []
        } catch (error) {
          // Acting refused for this session: nobody is in the result, as
          // with a 403 on every per-id lookup before.
          if (isV1ProblemError(error) && error.status === 403) return []
          throw error
        }
        const byId = new Map(rows.map((r) => [r.id, r]))
        return ids
          .map((id) => byId.get(id))
          .filter((r): r is NonNullable<typeof r> => r != null)
          .map(mapV1ManagedCustomerDetailed)
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
