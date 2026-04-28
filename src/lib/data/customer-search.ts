"use server"

import { sdk } from "@lib/config"
import { isAgentOrAdmin } from "@lib/util/roles"
import { retrieveCustomer } from "./customer"
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
