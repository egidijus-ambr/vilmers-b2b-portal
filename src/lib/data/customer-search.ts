"use server"

import { sdk } from "@lib/config"
import { isAgentOrAdmin } from "@lib/util/roles"
import { retrieveCustomer } from "./customer"
import { getActingCustomer } from "./acting-customer"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"

export async function searchCustomersForSelector(args: {
  query?: string
  limit?: number
  ids?: number[]
}): Promise<SearchCustomerResult[]> {
  const me = await retrieveCustomer()
  if (!me || !isAgentOrAdmin(me)) return []

  return await sdk.customer.searchCustomers(args)
}

/**
 * Re-read the acting customer from the session cookie (same resolver the
 * layout uses for `initialActingCustomer`). Lets a client tab resync after
 * the selection changed in another tab. Agents/admins only; never writes the
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
