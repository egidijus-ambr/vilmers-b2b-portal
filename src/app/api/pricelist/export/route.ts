import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { getActingCustomer } from "@lib/data/acting-customer"
import { getPriceListName } from "@lib/data/pricelist"
import { getPrimaryPriceListId } from "@configurator/lib/pricelist"
import { normalizeLanguage } from "@lib/i18n/config"
import { buildPricelistWorkbook } from "@lib/util/pricelist-workbook"
import { resolvePricelistWorkbookSettings } from "@lib/util/pricelist-theme"
import { fetchPricelistPhotos } from "@lib/util/pricelist-photos"
import { fetchPricelistBlueprints } from "@lib/util/pricelist-blueprints"
import { features } from "@lib/features"

// Fixed for every export — Vilmers is our own tenant, not the customer's.
const COMPANY_NAME = "Vilmers"
const CURRENCY = "EUR"

/**
 * Generates (does not proxy) a per-customer pricelist XLSX: one sheet per
 * sofa product listing its priced modules, plus an Info sheet with the
 * pricelist name and a product -> sheet-name index. See
 * src/lib/util/pricelist-workbook.ts for the sheet-building logic,
 * ProductsModule.getSofaPricelistExportProducts for the data fetch, and
 * src/lib/util/pricelist-blueprints.ts for the per-module PICTURE column
 * image fetch (category photos: pricelist-photos.ts).
 *
 * Every failure mode below returns a machine-readable `error` code (not a
 * localized message) — the client component maps codes to translated
 * copy via i18n, the same way customer-files-card handles its own
 * download failures.
 */
export async function GET(request: NextRequest) {
  try {
    // Feature-flagged off by default: hiding only the account-page button
    // would leave this route fully reachable to anyone who knows the URL,
    // and it returns a customer's negotiated prices. 404 (not 403) matches
    // this codebase's existing convention of not confirming a resource
    // exists — see furnisystems-backend's orderInvoice route, which returns
    // 404 rather than 403 on an ownership failure. Checked first, before
    // validateSession() and any data access.
    if (!features.pricelistExport) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    const sessionValidation = await validateSession()
    if (!sessionValidation.isValid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    let customer: any = null
    try {
      customer = await getActingCustomer()
    } catch (error) {
      // A genuine throw here (network/backend failure) is NOT the same as
      // "no acting customer" (a clean null return, handled below) — telling
      // the user "no customer selected" when the real cause is a backend
      // outage would send them to the wrong fix.
      console.error(
        "[pricelist-export] Failed to resolve acting customer:",
        error
      )
      return NextResponse.json({ error: "fetch_failed" }, { status: 502 })
    }

    if (!customer) {
      // Authenticated, but no customer in scope (e.g. an agent/admin session
      // with no acting customer selected). Distinct from "no pricelist" —
      // there's no account here to have a pricelist assigned to at all.
      return NextResponse.json({ error: "no_customer" }, { status: 409 })
    }

    const effectivePriceListId = getPrimaryPriceListId(customer)
    if (effectivePriceListId == null) {
      // Never fall back to a default/hardcoded pricelist here — that
      // fallback exists in the backend order path for a different purpose
      // and would silently export the wrong prices.
      return NextResponse.json({ error: "no_pricelist" }, { status: 409 })
    }

    const language = normalizeLanguage(
      request.nextUrl.searchParams.get("language")
    )

    // Tags come straight off the already-resolved `customer` (same
    // expression as getCustomerFilterData's own end-customer branch) rather
    // than a second call to getCustomerFilterData() — that helper
    // re-resolves the acting customer independently and can fall through to
    // a different branch (e.g. the "All products" override, or an
    // agent/admin's own tags) than the one used to pick the pricelist above,
    // which would silently mismatch the tag filter to the wrong customer.
    const customerTagIds: number[] =
      customer?.tags?.map((t: { id: number }) => t.id) ?? []

    let products
    try {
      products = await sdk.products.getSofaPricelistExportProducts({
        priceListId: effectivePriceListId,
        language,
        customerTagIds,
      })
    } catch (error) {
      console.error("[pricelist-export] Failed to fetch products:", error)
      return NextResponse.json({ error: "fetch_failed" }, { status: 502 })
    }

    const pricelistName = await getPriceListName(effectivePriceListId).catch(
      (error) => {
        console.error(
          "[pricelist-export] Failed to fetch pricelist name:",
          error
        )
        return `Pricelist ${effectivePriceListId}`
      }
    )

    // Photo and blueprint fetches are both best-effort (see
    // fetchPricelistPhotos / fetchPricelistBlueprints) and never throw — an
    // image failure must never cost the customer their price data, unlike
    // the product fetch above, which is allowed to fail the whole request.
    // Run concurrently: the two pools are fully independent (different URLs,
    // different validators, different maps) so there's no reason to
    // serialize them.
    const [photoBuffers, blueprintBuffers] = await Promise.all([
      fetchPricelistPhotos(products),
      fetchPricelistBlueprints(products),
    ])

    const generatedAt = new Date()
    // Per-brand rendering settings (rounding, multiplier row, M³ column,
    // group-header/border colors) resolved from the active build-time
    // theme — see src/lib/util/pricelist-theme.ts. Vilmers' preset
    // reproduces the pre-theming defaults for rounding/visibility, but its
    // resolved COLORS differ from the workbook's old hardcoded constants
    // (see that module's doc comment) — this is an intentional visual
    // change for the live export, not a bug.
    const pricelistSettings = resolvePricelistWorkbookSettings()
    const buffer = await buildPricelistWorkbook(
      products,
      {
        companyName: COMPANY_NAME,
        pricelistName,
        generatedAt,
        currency: CURRENCY,
      },
      photoBuffers,
      blueprintBuffers,
      pricelistSettings
    )

    const filename = `pricelist-${effectivePriceListId}-${generatedAt
      .toISOString()
      .slice(0, 10)}.xlsx`

    const bytes = new Uint8Array(buffer)
    return new Response(bytes, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": bytes.byteLength.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[pricelist-export] Unexpected error:", error)
    return NextResponse.json({ error: "unexpected" }, { status: 500 })
  }
}
