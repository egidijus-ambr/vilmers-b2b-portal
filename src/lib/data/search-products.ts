"use server"

import { sdk } from "@lib/config"
import { SupportedLanguage } from "@lib/i18n"
import { getCustomerFilterData } from "./customer"

export async function getSearchProducts(
  searchTerm: string,
  language: SupportedLanguage,
  page: number = 1
) {
  // Build filter based on customer tags and price lists
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  // Fetch products
  const result = await sdk.products.searchProducts(
    searchTerm,
    language,
    28,
    page,
    where
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
    const { customerTagIds, priceListIds } = await getCustomerFilterData()
    const where = sdk.products.buildWhereFilter(
      language,
      customerTagIds,
      priceListIds
    )

    const result = await sdk.products.searchProducts(
      searchTerm,
      language,
      4,
      1,
      where
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
