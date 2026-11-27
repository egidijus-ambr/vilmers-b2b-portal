import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateSession } from "@lib/util/session-validation"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { isV1OrderId } from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { getV1RequestContext } from "@lib/data/v1-transport"
import {
  PRIVATE_NO_STORE,
  jsonError,
  safeFilename,
  v1ProblemResponse,
  v1ScopedBinary,
} from "@lib/data/v1-bff"

// Backend base URL = GraphQL endpoint minus the /graphql suffix.
function backendBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_GRAPHQL || "").replace(
    /\/graphql\/?$/,
    ""
  )
}

/**
 * Invoice PDF of one order, same-origin (the browser cannot send the
 * httpOnly session).
 *
 *   v1 (2c-6): GET /api/v1/me/orders/:id/invoice.pdf with the v1 bearer
 *     (refreshed on demand: /api is outside the middleware) and, for an
 *     agent / admin with a selected customer, X-Acting-Customer-Id (D4, the
 *     same scope as the orders list). The id is validated first (local 404).
 *     The backend checks ownership; 404 = unknown, foreign or no invoice.
 *     Errors: src/lib/data/v1-bff.ts v1ProblemResponse. A v1 401 retries
 *     through the legacy alias below when a `_furni_jwt` is present.
 *   legacy: GET /api/orders/:id/invoice.pdf with `_furni_jwt` (unchanged;
 *     legacy-only sessions, v1-transport-rule.ts).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getV1RequestContext()
  if (ctx.identity === "guest") return jsonError(401, "Unauthorized")
  if (ctx.identity === "v1" && ctx.bearer) {
    if (!isV1OrderId(id)) return jsonError(404, "Invoice not found")
    try {
      const upstream = await v1ScopedBinary(
        ctx.bearer,
        `/me/orders/${encodeURIComponent(id)}/invoice.pdf`,
        "application/pdf"
      )
      const filename = safeFilename(
        upstream.headers.get("content-disposition"),
        `invoice-${id}.pdf`
      )
      const headers: Record<string, string> = {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": PRIVATE_NO_STORE,
      }
      const length = upstream.headers.get("content-length")
      if (length && /^\d+$/.test(length)) headers["Content-Length"] = length
      return new Response(upstream.body, { headers })
    } catch (error) {
      if (!(isV1ProblemError(error) && error.status === 401 && ctx.hasLegacyJwt)) {
        return v1ProblemResponse("invoice-pdf", error, {
          notFound: "Invoice not found",
          failed: "Failed to fetch invoice PDF",
        })
      }
      console.warn("[invoice-pdf] v1 answered 401, using the legacy route")
    }
  }
  return legacyInvoice(id)
}

/** Legacy REST path (legacy-only sessions; see v1-transport-rule.ts). */
async function legacyInvoice(id: string) {
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
