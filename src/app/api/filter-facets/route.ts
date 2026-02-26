import { NextRequest, NextResponse } from "next/server"
import { getCategoryFilterFacets } from "@lib/data/category-filters"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const permalink = searchParams.get("permalink") || ""
  const language = searchParams.get("language") || "en"
  const attrs = searchParams.get("attrs")
  const cats = searchParams.get("cats")

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
      selectedCategoryIds
    )
    return NextResponse.json(facets)
  } catch (error) {
    console.error("Error fetching filter facets:", error)
    return NextResponse.json({ attributeGroups: [], childCategories: [], totalCount: 0 }, { status: 500 })
  }
}
