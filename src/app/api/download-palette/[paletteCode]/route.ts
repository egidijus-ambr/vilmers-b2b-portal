import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@lib/util/session-validation"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function pdfResponse(
  upstream: Response,
  paletteCode: string
): Promise<Response> {
  const pdfBuffer = await upstream.arrayBuffer()
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="palette-${paletteCode}.pdf"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  })
}

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
    console.log("[palette-pdf-debug] route apiKey presence", {
      hasKey: !!process.env.VILMERS_PIM_API_KEY,
    })
    if (!apiKey) {
      console.error("VILMERS_PIM_API_KEY is not configured")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const { paletteCode } = await params
    const baseUrl =
      process.env.VILMERS_PIM_BASE_URL ?? "https://portal.vilmers.com"

    const upstreamUrl = `${baseUrl}/api/v1/fabric/pallets/${paletteCode}/download`
    console.log("[palette-pdf-debug] route upstream request", {
      paletteCode,
      upstreamUrl,
    })
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    console.log("[palette-pdf-debug] route upstream response", {
      paletteCode,
      status: upstream.status,
      ok: upstream.ok,
    })

    if (upstream.status === 200) {
      return pdfResponse(upstream, paletteCode)
    }

    // upstream returns 202 while generating
    if (upstream.status === 202) {
      let statusUrl: string
      try {
        const body = (await upstream.json()) as { status_url?: string }
        if (!body.status_url) throw new Error("missing status_url")
        statusUrl = body.status_url
      } catch {
        console.warn(
          `[palette-pdf] Unexpected 202 body for paletteCode=${paletteCode}`
        )
        return NextResponse.json(
          { error: "Failed to download palette PDF" },
          { status: 502 }
        )
      }

      for (let attempt = 0; attempt < 10; attempt++) {
        await sleep(3000)
        const poll = await fetch(statusUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (poll.status === 200) {
          return pdfResponse(poll, paletteCode)
        }
        if (poll.status === 202) {
          continue
        }
        console.warn(
          `[palette-pdf] Unexpected poll status ${poll.status} for paletteCode=${paletteCode}`
        )
        return NextResponse.json(
          { error: "Failed to download palette PDF" },
          { status: 502 }
        )
      }

      console.warn(
        `[palette-pdf] Poll timed out for paletteCode=${paletteCode}`
      )
      return NextResponse.json(
        { error: "Palette PDF generation timed out, please retry." },
        { status: 504 }
      )
    }

    console.error(
      `Upstream palette download failed for ${paletteCode}: ${upstream.status}`
    )
    return NextResponse.json(
      { error: "Failed to download palette PDF" },
      { status: upstream.status }
    )
  } catch (error) {
    console.error("Error downloading palette PDF:", error)
    return NextResponse.json(
      { error: "Failed to download palette PDF" },
      { status: 500 }
    )
  }
}
