import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"
import { CategorySortOption, SORT_OPTION_TO_GRAPHQL } from "@lib/furnisystems-sdk/modules/products/types"

export async function getCategoryProducts(
  categoryPermalink: string,
  language: string,
  page: number = 1,
  sortBy?: CategorySortOption,
  attrIds: number[] = []
) {
  // Build filter based on customer tags and price lists
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(language, customerTagIds, priceListIds)

  // Add attribute filters (AND logic - product must have ALL selected attributes)
  if (attrIds.length > 0) {
    if (!where.AND) where.AND = []
    for (const attrId of attrIds) {
      where.AND.push({
        product_attributes: {
          some: {
            productAttributeId: { equals: attrId },
          },
        },
      })
    }
  }

  const graphqlSortBy = SORT_OPTION_TO_GRAPHQL[sortBy ?? 'name_asc']

  // Fetch products
  const result = await sdk.products.getCategoryProducts({
    permalink: categoryPermalink,
    page,
    perPage: 28,
    where,
    sortBy: graphqlSortBy,
    language,
  })

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}
