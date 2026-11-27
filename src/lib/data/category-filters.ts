import { sdk } from "@lib/config"
import { emptyFacets } from "@lib/furnisystems-sdk/modules/products/v1-adapter"
import { getCustomerFilterData } from "./customer"
import { applyNewFilter, getNewSinceCutoff } from "./new-filter"
import { runCatalogListing, v1CategoryFacets } from "./catalog-v1"

export async function getCategoryFilterFacets(
  categoryPermalink: string,
  language: string,
  selectedAttributeIds: number[] = [],
  selectedCategoryIds: number[] = [],
  newOnly: boolean = false
) {
  // v1 or GraphQL per request: see ./v1-transport-rule.ts.
  return runCatalogListing(
    "category facets",
    (bearer) =>
      v1CategoryFacets(bearer, {
        permalink: categoryPermalink,
        language,
        attributeIds: selectedAttributeIds,
        categoryIds: selectedCategoryIds,
        newOnly,
      }),
    () =>
      getCategoryFilterFacetsGraphql(
        categoryPermalink,
        language,
        selectedAttributeIds,
        selectedCategoryIds,
        newOnly
      ),
    emptyFacets
  )
}

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getCategoryFilterFacetsGraphql(
  categoryPermalink: string,
  language: string,
  selectedAttributeIds: number[],
  selectedCategoryIds: number[],
  newOnly: boolean
) {
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  if (newOnly) {
    const cutoff = await getNewSinceCutoff()
    if (cutoff) applyNewFilter(where, cutoff)
  }

  return sdk.filters.getCategoryFilterFacets({
    categoryPermalink,
    language,
    selectedAttributeIds,
    selectedCategoryIds,
    where,
  })
}
