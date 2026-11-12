// Run: pnpm verify:palette-colors
import { resolvePaletteFabrics, parseCategory } from "../src/lib/fabric-palettes/palette-colors"
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
check("sources ignored, unresolved category -> default", nameOf(r, "009") === "w" && (r[0] as any).price_group_number === null)

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

// --- category overrides ---
const warnings: string[] = []
console.warn = (...a: any[]) => { warnings.push(String(a[0])) }
const VALID = { validNumbers: [1, 2, 3, 4] }
const catOf = (rows: any[], c = "009", opts: any = VALID) =>
  (resolvePaletteFabrics(F, rows, opts).find((x) => x.code === c) as any)?.price_group_number
const row = (id: number, category: unknown, codes: string[] | null = null) => ({
  fabric_palette: { id },
  color_codes: codes,
  color_overrides: [{ code: "009", category }],
})
check("digits", catOf([row(1, "1")]) === 1)
check("CAT 3", catOf([row(2, "CAT 3")]) === 3)
check("cat3 lowercase, padded", catOf([row(3, " cat 2 ")]) === 2)
check("no rows -> null (group default)", catOf([]) === null)
warnings.length = 0
check("letter A unresolved", catOf([row(4, "A")]) === null)
check("letter A warned once", warnings.length === 1)
catOf([row(4, "A")])
check("warn deduped per (palette, code)", warnings.length === 1)
check("garbage unresolved", catOf([row(5, "1x2")]) === null && catOf([row(6, "")]) === null)
warnings.length = 0
check("unknown number ignored", catOf([row(7, "9")]) === null && warnings.length === 1)
check("no validNumbers -> not validated", catOf([row(8, "9")], "009", {}) === 9)
check("override equal to default still resolves", catOf([row(9, "3")]) === 3)
check("conflict: first palette wins", catOf([row(10, "1"), row(11, "2")]) === 1)
check("conflict: unresolvable first falls to second", catOf([row(12, "B"), row(13, "2")]) === 2)
check("palette not selecting colour does not contribute", catOf([row(14, "1", ["002"]), row(15, "2", ["009"])]) === 2)
check("color_codes null selects colour", catOf([row(16, "4", null)]) === 4)
check("malformed overrides Json", catOf([{ fabric_palette: { id: 17 }, color_overrides: { a: 1 } }]) === null)
check("malformed overrides items", catOf([{ fabric_palette: { id: 18 }, color_overrides: [null, 5, { code: 9 }, { category: "1" }] }]) === null)
check("other colours untouched", catOf([row(19, "1")], "002") === null)
r = resolvePaletteFabrics(F, [{ fabric_palette: { id: 20 }, color_codes: null, color_overrides: [{ code: "009", name: "N", category: "2" }] },
  { fabric_palette: { id: 21 }, color_codes: null, color_overrides: [{ code: "009", name: "M", category: "1" }] }], VALID)
check("name and category resolved per field", nameOf(r, "009") === "N" && (r.find((x) => x.code === "009") as any).price_group_number === 2)
r = resolvePaletteFabrics(F, [{ fabric_palette: { id: 22 }, color_codes: null, color_overrides: [{ code: "009", name: "N" }] },
  { fabric_palette: { id: 23 }, color_codes: null, color_overrides: [{ code: "009", category: "1" }] }], VALID)
check("name from one palette, category from another", nameOf(r, "009") === "N" && (r.find((x) => x.code === "009") as any).price_group_number === 1)
const pc2: any = { manufacturer: { fabric_price_category: [{ id: 1, group_number: 3, fabric_groups: [
  { id: 1, fabrics: F, fabric_palettes: [{ fabric_palette: { id: 30 }, color_codes: null, color_overrides: [{ code: "009", category: "1" }, { code: "002", category: "7" }] }] }] },
  { id: 2, group_number: 1, fabric_groups: [] }] } }
const o2: any = applyPaletteColors(pc2, [30])
const fs2 = o2.manufacturer.fabric_price_category[0].fabric_groups[0].fabrics
check("adapter: category resolved against manufacturer numbers", fs2.find((x: any) => x.code === "009").price_group_number === 1 && fs2.find((x: any) => x.code === "002").price_group_number === null)

// --- letter categories (A->11, B->12) ---
const V2 = { validNumbers: [1, 2, 3, 11, 12] }
check("parseCategory A/B/CAT b", parseCategory("A") === 11 && parseCategory("b") === 12 && parseCategory("CAT B") === 12)
check("parseCategory other letters null", parseCategory("C") === null && parseCategory("AB") === null && parseCategory("Z") === null)
check("letter A resolves when 11 valid", catOf([row(40, "A")], "009", V2) === 11)
check("letter B resolves when 12 valid", catOf([row(41, "B")], "009", V2) === 12)
warnings.length = 0
check("letter A ignored when 11 not a valid number + warned", catOf([row(42, "A")]) === null && warnings.length === 1)
warnings.length = 0
check("letter C unresolved + warned", catOf([row(43, "C")], "009", V2) === null && warnings.length === 1)

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1) }
console.log("\nAll checks passed")
