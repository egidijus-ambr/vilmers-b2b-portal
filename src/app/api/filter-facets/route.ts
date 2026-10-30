import { NextRequest, NextResponse } from "next/server"
import { getCategoryFilterFacets } from "@lib/data/category-filters"
import { getNewSinceCutoff, isNewParam } from "@lib/data/new-filter"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const permalink = searchParams.get("permalink") || ""
  const language = searchParams.get("language") || "en"
  const attrs = searchParams.get("attrs")
  const cats = searchParams.get("cats")
  const newOnly = isNewParam(searchParams.get("new"))

  const selectedAttributeIds = attrs
    ? attrs.split(",").map(Number).filter(Boolean)
    : []

  const selectedCategoryIds = cats
    ? cats.split(",").map(Number).filter(Boolean)
    : []

  try {
    const facets = await getCategoryFilterFacets(
      permalink,
      language,
      selectedAttributeIds,
      selectedCategoryIds,
      newOnly
    )
    // Count for the "New" chip: total under the current filters + createdAt.
    // When the filter is already on, facets.totalCount is exactly that;
    // otherwise one extra facets call (same filters, newOnly) gives it.
    let newCount: number | null = null
    if ((await getNewSinceCutoff()) !== null) {
      newCount = newOnly
        ? facets.totalCount
        : (
            await getCategoryFilterFacets(
              permalink,
              language,
              selectedAttributeIds,
              selectedCategoryIds,
              true
            )
          ).totalCount
    }
    return NextResponse.json({ ...facets, newCount })
  } catch (error) {
    console.error("Error fetching filter facets:", error)
    return NextResponse.json({ attributeGroups: [], childCategories: [], totalCount: 0 }, { status: 500 })
  }
}
