"use server"

import { sdk } from "@lib/config"
import { unstable_noStore } from "next/cache"
import { getActingCustomer } from "@lib/data/acting-customer"
import { getDefaultPriceListId } from "@lib/data/default-pricelist"
import { getPrimaryPriceListId } from "@configurator/lib/pricelist"

export type ConfiguratorDataResult = {
  data: any
  /** The price list the data was fetched for; derived server-side. */
  priceListId: number
}

/**
 * Server-side wrapper for sdk.products.getConfiguratorData so the GraphQL
 * request carries the cookie auth token. The backend masks palette fields
 * (name / color_codes / color_overrides) for unauthenticated callers, and a
 * masked null means "all colours" to the client, so this must not run in the
 * browser. `paletteIds` still comes from the client so an agent acting for a
 * customer gets that customer's palettes.
 *
 * The price list is NOT accepted from the client: it is the acting
 * customer's primary list (direct, else group) resolved from the session, or
 * the shop's default list when there is no acting customer / no assigned
 * list. The id actually used is returned so the client prices against the
 * same list the rows were fetched for. A failure to resolve the acting
 * customer propagates (the hook shows an error) rather than silently
 * falling back to the default list, which would show a real customer the
 * wrong prices.
 */
export async function getConfiguratorDataAction(
  productContainerId: number,
  language?: string,
  paletteIds?: number[]
): Promise<ConfiguratorDataResult | null> {
  unstable_noStore()
  const actingCustomer = await getActingCustomer()
  const priceListId =
    getPrimaryPriceListId(actingCustomer) ?? (await getDefaultPriceListId())
  const data = await sdk.products.getConfiguratorData(
    productContainerId,
    priceListId,
    language,
    paletteIds
  )
  if (!data) return null
  return { data, priceListId }
}
