import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"

export async function getCollectionProducts(
  collectionPermalink: string,
  language: string,
  page: number = 1
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
  const result = await sdk.products.getCollectionProducts({
    permalink: collectionPermalink,
    page,
    perPage: 28,
    where,
    language,
  })

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}
