import { NextRequest, NextResponse } from "next/server"
import { normalizeLanguage } from "@lib/i18n/config"
import { resolveExportContext } from "@lib/util/pricelist-export-context"
import { ExportFetchError, startExport } from "@lib/util/pricelist-export-jobs"

export const runtime = "nodejs"

/**
 * POST /api/pricelist/export  body: { language }
 *
 * Starts (or joins, or instantly resolves from cache) a pricelist XLSX
 * build and returns `{ status: "ready" | "pending", jobId }`. Poll
 * /api/pricelist/export/status, then fetch /api/pricelist/export/file.
 *
 * The price list and tag set are derived from the session customer -- the
 * client only supplies the language. The old synchronous GET was removed:
 * a cold build takes ~2 minutes, which is not viable as one request.
 *
 * Every failure returns a machine-readable `error` code; the client maps
 * codes to translated copy.
 */
export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveExportContext()
    if (!resolved.ok) return resolved.response

    let rawLanguage: string | null = null
    try {
      const body = await request.json()
      if (typeof body?.language === "string") rawLanguage = body.language
    } catch {
      // Missing/invalid body: normalizeLanguage falls back to the default.
    }
    const language = normalizeLanguage(rawLanguage)

    try {
      const result = await startExport({ ...resolved.context, language })
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof ExportFetchError) {
        return NextResponse.json({ error: "fetch_failed" }, { status: 502 })
      }
      throw error
    }
  } catch (error) {
    console.error("[pricelist-export] Unexpected error:", error)
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
