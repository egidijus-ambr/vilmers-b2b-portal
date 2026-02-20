import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"

export async function getCategoryProducts(
  categoryPermalink: string,
  language: string,
  page: number = 1
) {
  // Build filter based on customer tags and price lists
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(language, customerTagIds, priceListIds)

  
  // Fetch products
  const result = await sdk.products.getCategoryProducts({
    permalink: categoryPermalink,
    page,
    perPage: 28,
    where,
  })

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}
