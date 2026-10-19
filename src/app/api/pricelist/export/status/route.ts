import { NextRequest, NextResponse } from "next/server"
import { features } from "@lib/features"
import { validateSession } from "@lib/util/session-validation"
import { getJob } from "@lib/util/pricelist-export-jobs"

export const runtime = "nodejs"

/** GET /api/pricelist/export/status?jobId= */
export async function GET(request: NextRequest) {
  try {
    if (!features.pricelistExport) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    const session = await validateSession()
    if (!session.isValid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const jobId = request.nextUrl.searchParams.get("jobId") ?? ""
    const job = getJob(jobId)
    // Unknown id (never existed, expired, or lost to a restart): the client
    // re-POSTs, which is instant if the file is cached.
    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({
      status: job.status,
      ...(job.status === "running" ? { stage: job.stage } : {}),
      ...(job.status === "error" ? { errorCode: job.errorCode ?? "unexpected" } : {}),
    })
  } catch (error) {
    console.error("[pricelist-export] Unexpected error (status):", error)
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
