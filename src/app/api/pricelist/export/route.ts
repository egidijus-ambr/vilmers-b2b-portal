import { NextRequest, NextResponse } from "next/server"
import { normalizeLanguage } from "@lib/i18n/config"
import { resolveExportContext } from "@lib/util/pricelist-export-context"
import { resolveExportSource } from "@lib/util/pricelist-export-source"
import { isExportProblemError } from "@lib/util/pricelist-export-v1"
import {
  ExportFetchError,
  ExportNoPricesError,
  startExport,
} from "@lib/util/pricelist-export-jobs"

export const runtime = "nodejs"

/**
 * POST /api/pricelist/export  body: { language }
 *
 * Starts (or joins, or instantly resolves from cache) a pricelist XLSX
 * build and returns `{ status: "ready" | "pending", jobId }`. Poll
 * /api/pricelist/export/status, then fetch /api/pricelist/export/file.
 *
 * The customer, price list and tag set are derived from the session -- the
 * client only supplies the language. On v1 sessions the backend chooses
 * them (GET /me/pricelist-export) and the file is keyed on its answer; on
 * legacy sessions (and a v1 401) they are derived here and read on GraphQL
 * (@lib/util/pricelist-export-source). The old synchronous GET was removed:
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
      const source = await resolveExportSource(resolved.context, language)
      const result = await startExport(source.combo, source.prefetched)
      return NextResponse.json(result)
    } catch (error) {
      if (isExportProblemError(error)) {
        return NextResponse.json({ error: error.code }, { status: error.status })
      }
      if (error instanceof ExportFetchError) {
        return NextResponse.json({ error: "fetch_failed" }, { status: 502 })
      }
      // No price rows for the caller's list: fail loudly instead of
      // delivering a workbook with blank prices.
      if (error instanceof ExportNoPricesError) {
        return NextResponse.json({ error: "no_prices" }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error("[pricelist-export] Unexpected error:", error)
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
