import "server-only"

import { cache } from "react"
import { sdk } from "@lib/config"
import { FurnisystemsProductDetail } from "@lib/furnisystems-sdk/modules/products/types"
import { runCatalogListing, v1ProductByPermalink } from "./catalog-v1"
import { getCustomerFilterData } from "./customer"

/**
 * Product page data (PDP, configurator page, generateMetadata).
 *
 * v1 (GET /catalog/products/by-permalink/:permalink, bearer + acting header +
 * showAll, see ./v1-transport-rule.ts): the backend applies the listing
 * visibility rule, so a product the caller may not see is a 404 -> null ->
 * the normal not-found page (owner decision: direct links to hidden /
 * off-tag / unpriced products stop working). Linked products are filtered
 * by the same rule on the server.
 * GraphQL (legacy-only sessions, or a v1 401): unchanged, with the
 * customer / anonymous tag and price-list filter resolved here.
 * Any other v1 failure: null (not-found page), as a GraphQL error gave.
 *
 * React `cache`: generateMetadata and the page share one request. Never in
 * a shared cache (bearer / acting header).
 */
export const getProductByPermalink = cache(
  async (
    permalink: string,
    language?: string
  ): Promise<FurnisystemsProductDetail | null> =>
    runCatalogListing<FurnisystemsProductDetail | null>(
      `product ${permalink}`,
      (bearer) =>
        v1ProductByPermalink(bearer, { permalink, language: language ?? "en" }),
      () => getProductByPermalinkGraphql(permalink, language),
      () => null
    )
)

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getProductByPermalinkGraphql(
  permalink: string,
  language?: string
): Promise<FurnisystemsProductDetail | null> {
  try {
    const { customerTagIds, priceListIds } = await getCustomerFilterData()
    return await sdk.products.getProductByPermalink(
      permalink,
      language,
      priceListIds,
      customerTagIds
    )
  } catch (error) {
    console.error(`Error fetching product by permalink "${permalink}":`, error)
    return null
  }
}
