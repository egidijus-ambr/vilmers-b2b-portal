// Checks the price-list export's "prices valid from" date: the pure
// latestValidFrom helper, and buildPricelistWorkbook's cover date (B2) +
// Info "Prices as of" (B3) read back with exceljs from hand-built fixtures —
// no backend/network involved.
//
// Run: pnpm exec sucrase-node scripts/verify-pricelist-valid-from.ts
// (also run it under e.g. TZ=America/Los_Angeles and TZ=Pacific/Kiritimati:
// valid_from is UTC midnight and must print as that calendar date anywhere).
import ExcelJS from "exceljs"
import { latestValidFrom } from "../src/lib/util/pricelist-valid-from"
import { buildPricelistWorkbook } from "../src/lib/util/pricelist-workbook"
import type {
  PricelistExportAdvancedProduct,
  PricelistExportComponentAssociation,
  PricelistExportProduct,
} from "../src/lib/furnisystems-sdk/modules/products/types"

let failed = 0
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  -> ${JSON.stringify(detail)}`}`)
  if (!cond) failed++
}
const iso = (d: Date | null) => (d ? d.toISOString() : null)

// ---------------------------------------------------------------- helper
check("empty -> null", latestValidFrom([]) === null)
check("all null/undefined/empty/invalid -> null", latestValidFrom([null, undefined, "", "not-a-date"]) === null)
check(
  "max of mixed strings and Dates",
  iso(latestValidFrom(["2026-01-01T00:00:00.000Z", null, new Date("2026-05-01T00:00:00.000Z"), "2026-03-01T00:00:00.000Z"])) ===
    "2026-05-01T00:00:00.000Z"
)
const midnight = latestValidFrom(["2026-03-01T00:00:00.000Z"])
check(
  "UTC midnight keeps its UTC calendar date",
  midnight !== null &&
    midnight.getUTCFullYear() === 2026 &&
    midnight.getUTCMonth() === 2 &&
    midnight.getUTCDate() === 1,
  iso(midnight)
)

// -------------------------------------------------------------- fixtures
const priceRow = (price: number, group: number, valid_from: string | null) => ({
  price,
  valid_from,
  fabrice_price_category: { group_number: group },
})
const group = (id: number, code: string, useFabricPrices = true) => ({
  id,
  code,
  order: id,
  use_fabric_prices_for_components: useFabricPrices,
  additional_component_group_profiles: [{ name: code }],
})
const assoc = (
  id: number,
  grp: ReturnType<typeof group>,
  p: Partial<PricelistExportComponentAssociation>
): PricelistExportComponentAssociation => ({
  extra_price: 0,
  extra_prices: [],
  price_fabric_category: [],
  ...p,
  additional_component: {
    id,
    code: `C-${id}`,
    component_sku: null,
    image: null,
    additional_component_profiles: [{ name: `Component ${id}` }],
    dimensions: null,
    package_dimensions: [],
    additional_component_group: grp,
  },
})
const product = (id: number, ap: Partial<PricelistExportAdvancedProduct>): PricelistExportProduct => ({
  id,
  advanced_product: {
    id,
    advanced_product_type: "SOFA",
    advanced_product_profiles: [{ name: `Product ${id}` }],
    category_photo: null,
    sofa_forms: [],
    advanced_product_price_fabric_category: [],
    additional_component_to_advanced_product: [],
    ...ap,
  },
})

const D = (ymd: string) => `${ymd}T00:00:00.000Z`
const model = group(1, "model-other")
const flatGroup = group(2, "extras", false)
const disabledGroup = group(3, "disabled")

const sofa = product(1, {
  sofa_forms: [
    {
      id: 11,
      name: "Module",
      code: "M-1",
      dimensions: null,
      package_dimensions: [],
      blueprint: null,
      form_price_fabric_category: [
        priceRow(500, 1, D("2026-02-01")), // wins group 1
        priceRow(400, 1, D("2029-01-01")), // loses the max-price pivot: not rendered
      ],
    },
  ],
})
const other = product(2, {
  advanced_product_type: "OTHER",
  additional_component_group_to_advanced_product: [
    { additional_component_group: { id: model.id } },
    { additional_component_group: { id: flatGroup.id } },
  ],
  additional_component_to_advanced_product: [
    // Rendered flat price -> 2026-03-01 is the expected maximum.
    assoc(21, model, { extra_prices: [{ price: 100, valid_from: D("2026-03-01") }] }),
    // Flat-priced group: its price_fabric_category rows are ignored.
    assoc(22, flatGroup, {
      extra_prices: [{ price: 50, valid_from: null }],
      price_fabric_category: [priceRow(70, 1, D("2027-06-01"))],
    }),
    // Group not enabled for this product: never rendered.
    assoc(23, disabledGroup, { extra_prices: [{ price: 10, valid_from: D("2027-01-01") }] }),
    // Legacy scalar price: rendered but carries no date.
    assoc(24, model, { extra_price: 30 }),
  ],
})
// Skipped entirely (its only priced component is in a disabled group).
const skipped = product(3, {
  advanced_product_type: "OTHER",
  additional_component_group_to_advanced_product: [],
  additional_component_to_advanced_product: [
    assoc(31, model, { extra_prices: [{ price: 10, valid_from: D("2028-01-01") }] }),
  ],
})
// Lowest-group fallback (flat group, no flat price): only group 1's row renders.
const fallback = product(4, {
  advanced_product_type: "OTHER",
  additional_component_group_to_advanced_product: [{ additional_component_group: { id: flatGroup.id } }],
  additional_component_to_advanced_product: [
    assoc(41, flatGroup, {
      price_fabric_category: [priceRow(80, 1, D("2026-01-15")), priceRow(90, 2, D("2030-01-01"))],
    }),
  ],
})

const cover = { image: null, lines: [], logo: null }
const generatedAt = new Date("2026-11-18T22:30:00.000Z")
const meta = { companyName: "Fixture", pricelistName: "Fixture", generatedAt, currency: "EUR" }

async function readDates(products: PricelistExportProduct[]) {
  const buf = await buildPricelistWorkbook(products, meta, new Map(), new Map(), new Map(), undefined, cover)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as any)
  return {
    cover: wb.getWorksheet("Cover")?.getCell("B2").value,
    info: wb.getWorksheet("Info")?.getCell("B3").value,
    created: wb.created?.toISOString(),
  }
}

async function main() {
  const a = await readDates([sofa, other, skipped, fallback])
  check("cover = latest rendered valid_from", a.cover === "01 03 2026", a)
  check("Info 'Prices as of' = same date", a.info === "2026-03-01", a)
  check("workbook.created still generatedAt", a.created === generatedAt.toISOString(), a)

  const b = await readDates([fallback])
  check("lowest-group fallback counts only the rendered group", b.cover === "15 01 2026", b)

  const noDates = product(5, {
    advanced_product_type: "OTHER",
    additional_component_group_to_advanced_product: [{ additional_component_group: { id: model.id } }],
    additional_component_to_advanced_product: [assoc(51, model, { extra_prices: [{ price: 5, valid_from: null }] })],
  })
  const c = await readDates([noDates])
  check("no dates -> cover falls back to generatedAt", c.cover === "18 11 2026", c)
  check("no dates -> Info falls back to generatedAt", c.info === "2026-11-18", c)

  console.log(failed ? `\n${failed} FAILED (TZ=${process.env.TZ ?? "system"})` : `\nall passed (TZ=${process.env.TZ ?? "system"})`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
