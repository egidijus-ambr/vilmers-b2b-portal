import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"
import { CategorySortOption, SORT_OPTION_TO_GRAPHQL } from "@lib/furnisystems-sdk/modules/products/types"


export async function getCategoryProducts(
  categoryPermalink: string,
  language: string,
  page: number = 1,
  sortBy?: CategorySortOption,
  attrIds: number[] = [],
  catIds: number[] = []
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
    selectedCategoryIds: catIds.length > 0 ? catIds : undefined,
  })

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}

export async function getAllCategoryProductNames(
  categoryPermalink: string,
  language: string,
  sortBy: string,
  attrIds: number[],
  catIds: number[]
): Promise<{ names: string[]; totalCount: number }> {
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

  const result = await sdk.products.getCategoryProductNames({
    permalink: categoryPermalink,
    where,
    language,
    selectedCategoryIds: catIds.length > 0 ? catIds : undefined,
  })

  return {
    names: result.names,
    totalCount: result.totalCount,
  }
}
