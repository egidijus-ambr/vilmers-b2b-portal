import { NextResponse } from "next/server"
import { getShopSettings } from "@lib/data/shop-settings"

export async function GET() {
  try {
    const shopSettings = await getShopSettings()
    return NextResponse.json(shopSettings)
  } catch (error) {
    console.error("Error fetching shop settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch shop settings" },
      { status: 500 }
    )
  }
}
