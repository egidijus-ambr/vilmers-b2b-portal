import { NextRequest, NextResponse } from "next/server"
import { getAllCategoryProductNames } from "@lib/data/category-products"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const permalink = searchParams.get("permalink") ?? ""
  const language = searchParams.get("language") ?? "en"
  const sort = searchParams.get("sort") ?? "name_asc"
  const attrs = searchParams.get("attrs")
  const cats = searchParams.get("cats")

  const attrIds = attrs ? attrs.split(",").map(Number).filter(Boolean) : []
  const catIds = cats ? cats.split(",").map(Number).filter(Boolean) : []

  try {
    const result = await getAllCategoryProductNames(
      permalink,
      language,
      sort,
      attrIds,
      catIds
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch category product names:", error)
    return NextResponse.json({ names: [], totalCount: 0 }, { status: 500 })
  }
}
