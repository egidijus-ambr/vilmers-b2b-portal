// Run: pnpm exec sucrase-node scripts/verify-palette-colors.ts
import { resolvePaletteFabrics } from "../src/lib/fabric-palettes/palette-colors"
import { applyPaletteColors } from "../src/configurator/lib/apply-palette-colors"

let failed = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`)
  if (!cond) failed++
}
const fab = (code: string, color_name: string) => ({ id: +code || 1, code, color_name })
const F = [fab("001", "antracit"), fab("002", "sand"), fab("009", "ecru"), fab("016", "cinnamon")]
const codes = (r: { code: string }[]) => r.map((x) => x.code).join(",")
const nameOf = (r: any[], c: string) => r.find((x) => x.code === c)?.color_name

check("no rows -> all", codes(resolvePaletteFabrics(F, [])) === "001,002,009,016")
check("null codes -> all", resolvePaletteFabrics(F, [{ color_codes: null }]).length === 4)
check("subset", codes(resolvePaletteFabrics(F, [{ color_codes: ["002", "009"] }])) === "002,009")
check("union of 2 rows", codes(resolvePaletteFabrics(F, [{ color_codes: ["002"] }, { color_codes: ["016"] }])) === "002,016")
check("null + subset -> all", resolvePaletteFabrics(F, [{ color_codes: ["002"] }, { color_codes: null }]).length === 4)
check("unknown codes ignored", codes(resolvePaletteFabrics(F, [{ color_codes: ["002", "999"] }])) === "002")

const ov = [{ code: "009", name: "white" }, { code: "001", name: "black" }]
let r = resolvePaletteFabrics(F, [{ color_codes: ["002", "009"], color_overrides: ov }])
check("override applied for selected code", nameOf(r, "009") === "white")
check("default_color_name kept", (r.find((x) => x.code === "009") as any).default_color_name === "ecru")
check("override for unselected code not shown", !r.some((x) => x.code === "001"))
check("non-overridden keeps default", nameOf(r, "002") === "sand")
check("search names contain both", JSON.stringify((r.find((x) => x.code === "009") as any).color_search_names) === JSON.stringify(["white", "ecru"]))

r = resolvePaletteFabrics(F, [
  { color_codes: ["009"], color_overrides: [{ code: "009", name: "first" }] },
  { color_codes: ["009"], color_overrides: [{ code: "009", name: "second" }] },
])
check("priority order wins", nameOf(r, "009") === "first")
check("both names searchable", (r[0] as any).color_search_names.join("|") === "first|second|ecru")
r = resolvePaletteFabrics(F, [
  { color_codes: ["002"], color_overrides: [{ code: "009", name: "x" }] },
  { color_codes: ["009"], color_overrides: [{ code: "009", name: "second" }] },
])
check("row not selecting code does not contribute override", nameOf(r, "009") === "second")
r = resolvePaletteFabrics(F, [{ color_codes: ["009"], color_overrides: [{ code: "009", name: "   " }] }])
check("blank override ignored", nameOf(r, "009") === "ecru")
r = resolvePaletteFabrics(F, [{ color_codes: ["009"], color_overrides: [{ code: "009", name: "w", category: "Z", category_source: "pim", name_source: "pim" } as any] }])
check("category/sources ignored", nameOf(r, "009") === "w" && !("category" in r[0]))

const warn = console.warn; let warned = 0; console.warn = () => { warned++ }
r = resolvePaletteFabrics(F, [{ color_codes: "oops" as any, color_overrides: "bad" }])
console.warn = warn
check("malformed codes -> all + warn", r.length === 4 && warned === 1)
check("malformed overrides -> defaults", nameOf(resolvePaletteFabrics(F, [{ color_codes: null, color_overrides: { a: 1 } }]), "009") === "ecru")

const frozen = Object.freeze(F.map((f) => Object.freeze({ ...f })))
const rows = [{ color_codes: ["009"], color_overrides: [{ code: "009", name: "w" }] }]
const before = JSON.stringify([frozen, rows])
resolvePaletteFabrics(frozen as any, rows)
check("inputs not mutated", JSON.stringify([frozen, rows]) === before)
check("empty result", resolvePaletteFabrics(F, [{ color_codes: ["nope"] }]).length === 0)
check("whitespace in fabric code trimmed", resolvePaletteFabrics([fab(" 002 ", "s")], [{ color_codes: ["002"] }]).length === 1)

// applyPaletteColors
const pc = {
  manufacturer: { fabric_price_category: [{ id: 1, fabric_groups: [
    { id: 1, fabrics: F, fabric_palettes: [
      { fabric_palette: { id: 175 }, color_codes: ["002", "009"], color_overrides: [{ code: "009", name: "white" }] },
      { fabric_palette: { id: 999 }, color_codes: null } ] },
    { id: 2, fabrics: F, fabric_palettes: [{ fabric_palette: { id: 175 }, color_codes: ["zzz"] }] },
  ] }] },
}
const out: any = applyPaletteColors(pc, [175])
const gs = out.manufacturer.fabric_price_category[0].fabric_groups
check("adapter: other palettes' rows ignored, group emptied dropped", gs.length === 1 && codes(gs[0].fabrics) === "002,009")
check("adapter: override name applied", nameOf(gs[0].fabrics, "009") === "white")
check("adapter: input not mutated", pc.manufacturer.fabric_price_category[0].fabric_groups.length === 2)

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1) }
console.log("\nAll checks passed")
