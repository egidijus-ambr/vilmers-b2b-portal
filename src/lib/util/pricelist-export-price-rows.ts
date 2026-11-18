import type { PricelistExportProduct } from "@lib/furnisystems-sdk/modules/products/types"

/**
 * Counts the pricelist-scoped price rows in a GET_SOFA_PRICELIST_EXPORT_PRODUCTS
 * response. Every counted relation is already filtered to the export's single
 * price list by the query, and the backend additionally scopes price rows to
 * the CALLER: rows the caller is not entitled to come back as empty arrays
 * (and relation filters in `where` are scoped the same way, so such products
 * usually do not come back at all).
 *
 * Zero rows therefore means "this response carries no prices for the list"
 * — either the caller is not entitled to it, or the list prices nothing the
 * customer can see. Either way a workbook built from it would show blank /
 * fallback prices, so it must never be built, memoized, stored or served
 * (see pricelist-export-jobs.ts computeFingerprintResult).
 *
 * The legacy unscoped `extra_price` scalar is deliberately NOT counted: it is
 * not a pricelist row and survives a denial.
 *
 * Pure (no server-only import) so scripts/verify-pricelist-export-price-rows.ts
 * can exercise it.
 */
export function countExportPriceRows(
  products: readonly PricelistExportProduct[] | null | undefined
): number {
  let rows = 0
  for (const product of products ?? []) {
    const ap = product?.advanced_product
    if (!ap) continue
    for (const form of ap.sofa_forms ?? []) {
      rows += form?.form_price_fabric_category?.length ?? 0
    }
    rows += ap.advanced_product_price_fabric_category?.length ?? 0
    for (const assoc of ap.additional_component_to_advanced_product ?? []) {
      rows += assoc?.extra_prices?.length ?? 0
      rows += assoc?.price_fabric_category?.length ?? 0
    }
  }
  return rows
}
