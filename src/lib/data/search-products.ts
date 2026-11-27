"use server"

import { sdk } from "@lib/config"
import { SupportedLanguage } from "@lib/i18n"
import { getCustomerFilterData } from "./customer"
import {
  QUICK_SEARCH_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
  runCatalogListing,
  v1SearchProducts,
} from "./catalog-v1"

const emptyPage = () => ({
  numberOfPages: 0,
  productsCount: 0,
  sortedProductContainers: [],
})

/** v1 or GraphQL per request: see ./catalog-transport-rule.ts. */
async function searchListing(
  searchTerm: string,
  language: SupportedLanguage,
  pageSize: number,
  page: number
) {
  return runCatalogListing(
    "search products",
    (bearer) =>
      v1SearchProducts(bearer, { q: searchTerm, language, page, pageSize }),
    () => searchProductsGraphql(searchTerm, language, pageSize, page),
    emptyPage
  )
}

/** GraphQL path (fallback until v1 impersonation; see catalog-transport-rule.ts). */
async function searchProductsGraphql(
  searchTerm: string,
  language: SupportedLanguage,
  pageSize: number,
  page: number
) {
  // Build filter based on customer tags and price lists
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  return sdk.products.searchProducts(searchTerm, language, pageSize, page, where)
}

export async function getSearchProducts(
  searchTerm: string,
  language: SupportedLanguage,
  page: number = 1
) {
  const result = await searchListing(
    searchTerm,
    language,
    CATALOG_PAGE_SIZE,
    page
  )

  return {
    products: result.sortedProductContainers,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}

export async function quickSearchProducts(
  searchTerm: string,
  language: SupportedLanguage
) {
  try {
    const result = await searchListing(
      searchTerm,
      language,
      QUICK_SEARCH_PAGE_SIZE,
      1
    )

    return JSON.parse(
      JSON.stringify({
        products: result.sortedProductContainers,
        totalCount: result.productsCount,
      })
    )
  } catch (error) {
    console.error("quickSearchProducts failed:", error)
    return { products: [], totalCount: 0 }
  }
}
