import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"

export async function POST(request: NextRequest) {
  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return NextResponse.json(
        { totalQty: null, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!process.env.VILMERS_AX_API_KEY) {
      return NextResponse.json(
        { totalQty: null, error: "Stock check is not configured" },
        { status: 503 }
      )
    }

    let body: { itemId?: string; configId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { totalQty: null, error: "Invalid request body" },
        { status: 400 }
      )
    }

    const { itemId, configId } = body
    if (!itemId || !configId) {
      return NextResponse.json(
        { totalQty: null, error: "Missing fabric identifiers" },
        { status: 400 }
      )
    }

    // AX expects 5-digit fabric line codes split as "XX-XXX" (e.g. "11149" -> "11-149").
    const axItemId = itemId.replace(/^(\d{2})(\d{3})$/, "$1-$2")

    const result = await sdk.materialAvailability.getAvailability({
      dataAreaId: "vilm",
      itemId: axItemId,
      configId,
    })

    return NextResponse.json({ totalQty: result.totalQty, error: null })
  } catch (err: any) {
    console.error("[fabric-availability] Failed:", err?.message || err)
    return NextResponse.json(
      { totalQty: null, error: "Stock unavailable" },
      { status: 502 }
    )
  }
}
