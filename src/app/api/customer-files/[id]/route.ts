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
    // Validate the session; the backend re-checks file ownership itself.
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
      `${base}/api/customer-files/${encodeURIComponent(id)}/download`,
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
        cache: "no-store",
      }
    )

    if (upstream.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (upstream.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    if (!upstream.ok) {
      console.error(
        `[customer-file] upstream failed for file=${id}: ${upstream.status}`
      )
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: 502 }
      )
    }

    const buffer = await upstream.arrayBuffer()
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream"
    const disposition =
      upstream.headers.get("content-disposition") ??
      `attachment; filename="file-${id}"`

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Error fetching customer file:", error)
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 })
  }
}
