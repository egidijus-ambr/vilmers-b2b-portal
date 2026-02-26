import { sdk } from "@lib/config"
import { getCustomerFilterData } from "./customer"

export async function getCategoryFilterFacets(
  categoryPermalink: string,
  language: string,
  selectedAttributeIds: number[] = [],
  selectedCategoryIds: number[] = []
) {
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  return sdk.filters.getCategoryFilterFacets({
    categoryPermalink,
    language,
    selectedAttributeIds,
    selectedCategoryIds,
    where,
  })
}
