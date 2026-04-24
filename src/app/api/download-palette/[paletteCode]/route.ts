import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@lib/util/session-validation"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paletteCode: string }> }
) {
  try {
    // Validate customer session
    const sessionValidation = await validateSession()
    if (!sessionValidation.isValid) {
      console.error("Session validation failed:", sessionValidation.error)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.VILMERS_PIM_API_KEY
    console.log("[palette-pdf-debug] route apiKey presence", { hasKey: !!process.env.VILMERS_PIM_API_KEY })
    if (!apiKey) {
      console.error("VILMERS_PIM_API_KEY is not configured")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const { paletteCode } = await params

    const upstreamUrl = `https://portal.vilmers.com/api/v1/fabric/pallets/${paletteCode}/download`
    console.log("[palette-pdf-debug] route upstream request", { paletteCode, upstreamUrl })
    const upstream = await fetch(
      upstreamUrl,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )
    console.log("[palette-pdf-debug] route upstream response", { paletteCode, status: upstream.status, ok: upstream.ok })

    if (!upstream.ok) {
      console.error(
        `Upstream palette download failed for ${paletteCode}: ${upstream.status}`
      )
      return NextResponse.json(
        { error: "Failed to download palette PDF" },
        { status: upstream.status }
      )
    }

    const pdfBuffer = await upstream.arrayBuffer()

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="palette-${paletteCode}.pdf"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error downloading palette PDF:", error)
    return NextResponse.json(
      { error: "Failed to download palette PDF" },
      { status: 500 }
    )
  }
}
