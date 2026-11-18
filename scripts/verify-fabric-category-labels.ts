// Run: pnpm exec sucrase-node scripts/verify-fabric-category-labels.ts
// Proves pricelist price-column headers use injected labels, fall back to the
// backend-mirroring defaults, and keep the PRICE sentinel untouched.
import ExcelJS from "exceljs"
import { buildPricelistWorkbook } from "../src/lib/util/pricelist-workbook"
import {
  defaultFabricCategoryLabel,
  getFabricCategoryLabel,
} from "../src/lib/fabric-category-labels"

const cat = (n: number) => ({ fabrice_price_category: { group_number: n } })
const mk = (groups: number[]): any => [
  {
    id: 1,
    advanced_product: {
      advanced_product_type: "SOFA",
      advanced_product_profiles: [{ name: "Test Sofa" }],
      advanced_product_price_fabric_category: [],
      additional_component_to_advanced_product: [],
      sofa_forms: [
        {
          id: 1,
          name: "Mod",
          dimensions: null,
          package_dimensions: [],
          form_price_fabric_category: groups.map((g) => ({ ...cat(g), price: 100 })),
        },
      ],
    },
  },
]

async function headers(products: any, labels?: Record<string, string>) {
  const buf = await buildPricelistWorkbook(
    products,
    { companyName: "X", pricelistName: "L", generatedAt: new Date(), currency: "EUR", language: "en" },
    new Map(),
    new Map(),
    new Map(),
    labels ? { fabricCategoryLabels: labels } : undefined
  )
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as any)
  const out: string[] = []
  wb.eachSheet((ws) => {
    for (let r = 1; r <= 14; r++) {
      const cells: string[] = []
      ws.getRow(r).eachCell((c) => {
        if (typeof c.value === "string") cells.push(c.value)
      })
      out.push(`${ws.name}#${r}: ${cells.join(" | ")}`)
    }
  })
  return out
}

function check(cond: boolean, msg: string) {
  console.log(`${cond ? "PASS" : "FAIL"}: ${msg}`)
  if (!cond) process.exitCode = 1
}

async function main() {
  const injected = await headers(mk([1, 3, 11, 14]), { "1": "Cat. Ein", "3": "Kat 3", "11": "Leder A" })
  const dflt = await headers(mk([1, 3, 11, 14]))
  const priceOnly = await headers(mk([]), { "-1": "HACK" })
  const has = (rows: string[], s: string) => rows.some((r) => r.includes(s))
  check(has(injected, "Cat. Ein") && has(injected, "Kat 3") && has(injected, "Leder A"), "injected labels used")
  check(has(injected, "CAT14"), "group missing from injected map falls back to CAT{n}")
  check(!has(injected, "CAT1 ") && !has(injected, "| CAT3"), "defaults not used where injected")
  check(has(dflt, "CAT1") && has(dflt, "CAT3") && has(dflt, "Leather A") && has(dflt, "CAT14"), "no labels -> backend defaults")
  check(has(priceOnly, "PRICE") && !has(priceOnly, "HACK"), "PRICE sentinel untouched by injected map")
  check(defaultFabricCategoryLabel(12) === "Leather B" && defaultFabricCategoryLabel(7) === "CAT7", "default fn")
  check(getFabricCategoryLabel({ "2": "X" }, 2) === "X" && getFabricCategoryLabel({}, 4) === "CAT4", "getFabricCategoryLabel")
}
main()
