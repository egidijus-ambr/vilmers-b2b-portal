import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"
import { runCatalogListing, v1CollectionProducts } from "./catalog-v1"

export async function getCollectionProducts(
  collectionPermalink: string,
  language: string,
  page: number = 1
) {
  // v1 or GraphQL per request: see ./v1-transport-rule.ts.
  const result = await runCatalogListing(
    "collection products",
    (bearer) =>
      v1CollectionProducts(bearer, {
        permalink: collectionPermalink,
        language,
        page,
      }),
    () => getCollectionProductsGraphql(collectionPermalink, language, page),
    () => ({ numberOfPages: 0, productsCount: 0, sortedProductContainers: [] })
  )

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getCollectionProductsGraphql(
  collectionPermalink: string,
  language: string,
  page: number
) {
  // Build filter based on customer tags and price lists
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  // Fetch products (collections have no sortBy/attribute filters — flat list
  // ordered by fixed server-side collection position)
  return sdk.products.getCollectionProducts({
    permalink: collectionPermalink,
    page,
    perPage: 28,
    where,
    language,
  })
}
