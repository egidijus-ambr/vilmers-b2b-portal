import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"
import { applyNewFilter, getNewSinceCutoff } from "./new-filter"

export async function getCategoryFilterFacets(
  categoryPermalink: string,
  language: string,
  selectedAttributeIds: number[] = [],
  selectedCategoryIds: number[] = [],
  newOnly: boolean = false
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
