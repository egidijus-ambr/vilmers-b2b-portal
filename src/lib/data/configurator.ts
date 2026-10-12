"use server"

import { sdk } from "@lib/config"
import { unstable_noStore } from "next/cache"

/**
 * Server-side wrapper for sdk.products.getConfiguratorData so the GraphQL
 * request carries the cookie auth token. The backend masks palette fields
 * (name / color_codes / color_overrides) for unauthenticated callers, and a
 * masked null means "all colours" to the client, so this must not run in the
 * browser. `paletteIds` still comes from the client so an agent acting for a
 * customer gets that customer's palettes.
 */
export async function getConfiguratorDataAction(
  productContainerId: number,
  priceListId: number,
  language?: string,
  paletteIds?: number[]
): Promise<any | null> {
  unstable_noStore()
  return sdk.products.getConfiguratorData(
    productContainerId,
    priceListId,
    language,
    paletteIds
  )
}
