import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Same-origin proxy for the backend's Tawk.to login hash. The backend computes
// the hash for the account of the verified Bearer session and ignores any
// email in the body, so the browser (which cannot read the httpOnly
// `_furni_jwt` cookie) asks this route instead of calling the backend.
export async function POST() {
  try {
    const cookieStore = await cookies()
    const jwtToken = cookieStore.get("_furni_jwt")?.value
    if (!jwtToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const base = process.env.NEXT_PUBLIC_BACKEND_REST_API
    if (!base) {
      console.error("NEXT_PUBLIC_BACKEND_REST_API is not configured")
      return NextResponse.json(
        { error: "Backend not configured" },
        { status: 500 }
      )
    }

    const upstream = await fetch(`${base}/tawk-hash`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "x-client": "portal",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    })

    let body: unknown
    try {
      body = await upstream.json()
    } catch {
      console.error(
        `[tawk-hash] upstream returned non-JSON: ${upstream.status}`
      )
      return NextResponse.json(
        { error: "Failed to generate hash" },
        { status: 502 }
      )
    }

    return NextResponse.json(body, {
      status: upstream.status,
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("Error fetching Tawk.to hash:", error)
    return NextResponse.json(
      { error: "Failed to generate hash" },
      { status: 502 }
    )
  }
}
