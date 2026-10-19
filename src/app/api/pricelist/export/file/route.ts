import { NextRequest, NextResponse } from "next/server"
import { resolveExportContext } from "@lib/util/pricelist-export-context"
import {
  combosEqual,
  getJob,
  openJobFile,
} from "@lib/util/pricelist-export-jobs"

export const runtime = "nodejs"

/**
 * GET /api/pricelist/export/file?jobId=
 *
 * Re-derives (priceListId, tagIds) from the session customer and requires
 * an exact match with the job's combo (language comes from the job), so a
 * leaked/guessed jobId cannot hand one customer another's prices.
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveExportContext()
    if (!resolved.ok) return resolved.response

    const job = getJob(request.nextUrl.searchParams.get("jobId") ?? "")
    if (!job || job.status !== "ready") {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    if (
      !combosEqual(job.combo, { ...resolved.context, language: job.combo.language })
    ) {
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
