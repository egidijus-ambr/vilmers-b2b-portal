import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateSession } from "@lib/util/session-validation"

// Backend base URL = GraphQL endpoint minus the /graphql suffix.
function backendBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_GRAPHQL || "").replace(
    /\/graphql\/?$/,
    ""
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate customer session (backend re-checks order ownership itself).
    const sessionValidation = await validateSession()
    if (!sessionValidation.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = await cookies()
    const jwtToken = cookieStore.get("_furni_jwt")?.value
    if (!jwtToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const base = backendBaseUrl()
    if (!base) {
      console.error("NEXT_PUBLIC_BACKEND_GRAPHQL is not configured")
      return NextResponse.json(
        { error: "Backend not configured" },
        { status: 500 }
      )
    }

    const { id } = await params
    const upstream = await fetch(
      `${base}/api/orders/${encodeURIComponent(id)}/invoice.pdf`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        cache: "no-store",
      }
    )

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (upstream.status === 404) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    if (!upstream.ok) {
      console.error(
        `[invoice-pdf] upstream failed for order=${id}: ${upstream.status}`
      )
      return NextResponse.json(
        { error: "Failed to fetch invoice PDF" },
        { status: 502 }
      )
    }

    const pdfBuffer = await upstream.arrayBuffer()
    const filename =
      upstream.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `invoice-${id}.pdf`
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching invoice PDF:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice PDF" },
      { status: 502 }
    )
  }
}
