import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"
import { applyNewFilter, getNewSinceCutoff } from "./new-filter"
import { CategorySortOption, SORT_OPTION_TO_GRAPHQL } from "@lib/furnisystems-sdk/modules/products/types"
import {
  runCatalogListing,
  v1CategoryProductNames,
  v1CategoryProducts,
} from "./catalog-v1"


export async function getCategoryProducts(
  categoryPermalink: string,
  language: string,
  page: number = 1,
  sortBy?: CategorySortOption,
  attrIds: number[] = [],
  catIds: number[] = [],
  newOnly: boolean = false
) {
  // v1 or GraphQL per request: see ./catalog-transport-rule.ts.
  const result = await runCatalogListing(
    "category products",
    (bearer) =>
      v1CategoryProducts(bearer, {
        permalink: categoryPermalink,
        language,
        page,
        sort: sortBy ?? "name_asc",
        attributeIds: attrIds,
        categoryIds: catIds,
        newOnly,
      }),
    () =>
      getCategoryProductsGraphql(
        categoryPermalink,
        language,
        page,
        sortBy,
        attrIds,
        catIds,
        newOnly
      ),
    () => ({ numberOfPages: 0, productsCount: 0, sortedProductContainers: [] })
  )

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}

/** GraphQL path (fallback until v1 impersonation; see catalog-transport-rule.ts). */
async function getCategoryProductsGraphql(
  categoryPermalink: string,
  language: string,
  page: number,
  sortBy: CategorySortOption | undefined,
  attrIds: number[],
  catIds: number[],
  newOnly: boolean
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

  if (newOnly) {
    const cutoff = await getNewSinceCutoff()
    if (cutoff) applyNewFilter(where, cutoff)
  }

  const graphqlSortBy = SORT_OPTION_TO_GRAPHQL[sortBy ?? 'name_asc']

  // Fetch products
  return sdk.products.getCategoryProducts({
    permalink: categoryPermalink,
    page,
    perPage: 28,
    where,
    sortBy: graphqlSortBy,
    language,
    selectedCategoryIds: catIds.length > 0 ? catIds : undefined,
  })
}

export async function getAllCategoryProductNames(
  categoryPermalink: string,
  language: string,
  sortBy: string,
  attrIds: number[],
  catIds: number[],
  newOnly: boolean = false
): Promise<{
  names: string[]
  products: { id: number; name: string }[]
  totalCount: number
}> {
  // v1 or GraphQL per request: see ./catalog-transport-rule.ts.
  const result = await runCatalogListing(
    "category product names",
    (bearer) =>
      v1CategoryProductNames(bearer, {
        permalink: categoryPermalink,
        language,
        attributeIds: attrIds,
        categoryIds: catIds,
        newOnly,
      }),
    () =>
      getCategoryProductNamesGraphql(
        categoryPermalink,
        language,
        attrIds,
        catIds,
        newOnly
      ),
    () => ({ names: [], products: [], totalCount: 0 })
  )

  return {
    names: result.names,
    products: result.products ?? [],
    totalCount: result.totalCount,
  }
}

/** GraphQL path (fallback until v1 impersonation; see catalog-transport-rule.ts). */
async function getCategoryProductNamesGraphql(
  categoryPermalink: string,
  language: string,
  attrIds: number[],
  catIds: number[],
  newOnly: boolean
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

  if (newOnly) {
    const cutoff = await getNewSinceCutoff()
    if (cutoff) applyNewFilter(where, cutoff)
  }

  return sdk.products.getCategoryProductNames({
    permalink: categoryPermalink,
    where,
    language,
    selectedCategoryIds: catIds.length > 0 ? catIds : undefined,
  })
}
