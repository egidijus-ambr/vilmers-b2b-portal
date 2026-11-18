// Checks the pricelist-export "no price rows" rule (countExportPriceRows): a
// response the backend scoped down to nothing for the caller (empty arrays,
// or no products at all) must count as zero rows so pricelist-export-jobs.ts
// refuses to build, memoize, store or serve it. The legacy unscoped
// `extra_price` scalar must NOT count as a price row. Pure fixtures, no
// backend/network.
//
// Run: pnpm verify:pricelist-export-price-rows
import { countExportPriceRows } from "../src/lib/util/pricelist-export-price-rows"
import type { PricelistExportProduct } from "../src/lib/furnisystems-sdk/modules/products/types"

let failed = 0
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  -> ${JSON.stringify(detail)}`}`)
  if (!cond) failed++
}

const row = { price: 100, valid_from: null, fabrice_price_category: { group_number: 1 } }
function product(ap: Record<string, unknown> | null): PricelistExportProduct {
  return {
    id: 1,
    advanced_product: ap
      ? ({
          id: 1,
          advanced_product_type: "SOFA",
          advanced_product_profiles: [],
          category_photo: null,
          sofa_forms: [],
          advanced_product_price_fabric_category: [],
          additional_component_to_advanced_product: [],
          ...ap,
        } as any)
      : null,
  }
}

check("null/undefined/[] -> 0", countExportPriceRows(null) + countExportPriceRows(undefined) + countExportPriceRows([]) === 0)
check("product without advanced_product -> 0", countExportPriceRows([product(null)]) === 0)

const denied = [
  product({
    sofa_forms: [{ id: 1, form_price_fabric_category: [] }],
    advanced_product_price_fabric_category: [],
    additional_component_to_advanced_product: [
      // Denied rows come back as empty arrays; the scalar survives.
      { extra_price: 250, extra_prices: [], price_fabric_category: [] },
    ],
  }),
]
check("denied (all scoped arrays empty, extra_price scalar set) -> 0", countExportPriceRows(denied) === 0, countExportPriceRows(denied))

check(
  "module rows count",
  countExportPriceRows([product({ sofa_forms: [{ form_price_fabric_category: [row, row] }] })]) === 2
)
check(
  "base fabric-category rows count",
  countExportPriceRows([product({ advanced_product_price_fabric_category: [row] })]) === 1
)
check(
  "component extra_prices + price_fabric_category count",
  countExportPriceRows([
    product({
      additional_component_to_advanced_product: [
        { extra_price: 0, extra_prices: [{ price: 0, valid_from: null }], price_fabric_category: [] },
        { extra_price: 0, extra_prices: [], price_fabric_category: [row] },
      ],
    }),
  ]) === 2
)
check(
  "a zero-valued scoped row is still a row (0 IS a real price)",
  countExportPriceRows([
    product({ additional_component_to_advanced_product: [{ extra_price: 0, extra_prices: [{ price: 0 }] }] }),
  ]) === 1
)
check(
  "missing (undefined) relations tolerated",
  countExportPriceRows([product({ sofa_forms: undefined, advanced_product_price_fabric_category: undefined, additional_component_to_advanced_product: undefined })]) === 0
)
check(
  "mixed products sum",
  countExportPriceRows([...denied, product({ sofa_forms: [{ form_price_fabric_category: [row] }] })]) === 1
)

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
