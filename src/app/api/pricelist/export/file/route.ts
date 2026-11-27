import { NextRequest, NextResponse } from "next/server"
import { resolveExportContext } from "@lib/util/pricelist-export-context"
import {
  getJob,
  jobBelongsTo,
  openJobFile,
} from "@lib/util/pricelist-export-jobs"

export const runtime = "nodejs"

/**
 * GET /api/pricelist/export/file?jobId=
 *
 * Re-resolves the customer in scope (and its cover lines) from the session
 * and requires the job to have been built for exactly that customer
 * (jobBelongsTo), so a leaked/guessed jobId cannot hand one customer
 * another's prices. The price list / tags are not re-derived: on v1 only
 * the backend knows them (the job carries the answer's values).
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveExportContext()
    if (!resolved.ok) return resolved.response

    const job = getJob(request.nextUrl.searchParams.get("jobId") ?? "")
    if (!job || job.status !== "ready") {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    if (!jobBelongsTo(job.combo, resolved.context)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const file = await openJobFile(job)
    if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 })

    // Dated by when the file was built, matching its "Prices as of" cell.
    const filename = `pricelist-${job.combo.priceListId}-${file.builtAt
      .toISOString()
      .slice(0, 10)}.xlsx`
    return new Response(file.stream, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": file.size.toString(),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[pricelist-export] Unexpected error (file):", error)
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
