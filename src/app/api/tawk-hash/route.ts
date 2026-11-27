import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { getV1RequestContext } from "@lib/data/v1-transport"
import { jsonError, v1ProblemResponse, v1SelfPost } from "@lib/data/v1-bff"

// Same-origin proxy for the backend's Tawk.to login hash. The backend computes
// the hash for the account of the verified Bearer session and ignores any
// email in the body, so the browser (which cannot read the httpOnly
// `_furni_jwt` cookie) asks this route instead of calling the backend.
//
//   v1 (2c-6): POST /api/v1/integrations/tawk/hash, no body, the v1 bearer
//     (refreshed on demand), never an acting header (the hash is the
//     session's own login; an impersonation session gets the customer's
//     oldest login). 200 { hash }. 403 = admin-issued session / customer
//     without a login, 503 = chat not configured: the widget then stays in
//     its unauthenticated state (src/modules/common/components/tawk-to-chat).
//     Errors: src/lib/data/v1-bff.ts. A v1 401 retries through the legacy
//     alias when a `_furni_jwt` is present.
//   legacy: POST /api/tawk-hash with `_furni_jwt` (unchanged).
export async function POST() {
  const ctx = await getV1RequestContext()
  if (ctx.identity === "guest") return jsonError(401, "Unauthorized")
  if (ctx.identity === "v1" && ctx.bearer) {
    try {
      const body = await v1SelfPost<{ hash?: unknown }>(
        ctx.bearer,
        "/integrations/tawk/hash"
      )
      if (typeof body?.hash !== "string" || !body.hash) {
        return jsonError(502, "Failed to generate hash")
      }
      return NextResponse.json(
        { hash: body.hash },
        { headers: { "Cache-Control": "private, no-store" } }
      )
    } catch (error) {
      if (!(isV1ProblemError(error) && error.status === 401 && ctx.hasLegacyJwt)) {
        return v1ProblemResponse("tawk-hash", error, {
          notFound: "Not found",
          failed: "Failed to generate hash",
        })
      }
      console.warn("[tawk-hash] v1 answered 401, using the legacy route")
    }
  }
  return legacyTawkHash()
}

/** Legacy REST path (legacy-only sessions; see v1-transport-rule.ts). */
async function legacyTawkHash() {
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
