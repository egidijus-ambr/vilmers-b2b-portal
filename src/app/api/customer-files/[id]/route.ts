import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateSession } from "@lib/util/session-validation"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { parseV1FileId } from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
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
 * One company document (CustomerFile), same-origin.
 *
 *   v1 (2c-6): GET /api/v1/me/files/:id/download with the v1 bearer
 *     (refreshed on demand) and, for an agent / admin with a selected
 *     customer, X-Acting-Customer-Id (the files card lists the ACTING
 *     customer's files). The id is validated first (local 404). The backend
 *     checks ownership; 404 = unknown or foreign file. Errors:
 *     src/lib/data/v1-bff.ts. A v1 401 retries through the legacy alias.
 *   legacy: GET /api/customer-files/:id/download with `_furni_jwt`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await getV1RequestContext()
  if (ctx.identity === "guest") return jsonError(401, "Unauthorized")
  if (ctx.identity === "v1" && ctx.bearer) {
    const fileId = parseV1FileId(id)
    if (fileId === null) return jsonError(404, "File not found")
    try {
      const upstream = await v1ScopedBinary(
        ctx.bearer,
        `/me/files/${fileId}/download`,
        "*/*"
      )
      const contentType =
        upstream.headers.get("content-type") ?? "application/octet-stream"
      const filename = safeFilename(
        upstream.headers.get("content-disposition"),
        `file-${fileId}`
      )
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": PRIVATE_NO_STORE,
        "X-Content-Type-Options": "nosniff",
      }
      const length = upstream.headers.get("content-length")
      if (length && /^\d+$/.test(length)) headers["Content-Length"] = length
      return new Response(upstream.body, { headers })
    } catch (error) {
      if (!(isV1ProblemError(error) && error.status === 401 && ctx.hasLegacyJwt)) {
        return v1ProblemResponse("customer-file", error, {
          notFound: "File not found",
          failed: "Failed to fetch file",
        })
      }
      console.warn("[customer-file] v1 answered 401, using the legacy route")
    }
  }
  return legacyFile(id)
}

/** Legacy REST path (legacy-only sessions; see v1-transport-rule.ts). */
async function legacyFile(id: string) {
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
