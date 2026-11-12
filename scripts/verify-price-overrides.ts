// Run: pnpm verify:price-overrides
import { getSelectedGroupNumbers, getPriceFromPriceCategories } from "../src/configurator/lib/price-utils"
import { buildSortedFabricGroups, pickDefaultFabric } from "../src/configurator/lib/group-logic"
import {
  getFabricGroupNumber,
  getGroupDisplayCategory,
  getGroupEffectiveCategories,
} from "../src/lib/fabric-palettes/fabric-category"

let failed = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`)
  if (!cond) failed++
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const group = (n: number) => ({ id: n, form_price_fabric_category: { group_number: n } }) as any
const fab = (code: string, color_name: string | null, price_group_number?: number | null) =>
  ({ id: +code || 1, code, color_name, price_group_number }) as any
const sel = (g: any, f: any, option = 1): any => ({ fabricGroupObject: g, fabricObject: f, option: { id: option } })

// getSelectedGroupNumbers: single
const g3 = group(3)
check("single: group default", same(getSelectedGroupNumbers({ fabricGroupObject: g3, fabricObject: fab("1", "a"), combinationFabrics: null }), [3]))
check("single: override wins", same(getSelectedGroupNumbers({ fabricGroupObject: g3, fabricObject: fab("1", "a", 1), combinationFabrics: null }), [1]))
check("single: override equal to default", same(getSelectedGroupNumbers({ fabricGroupObject: g3, fabricObject: fab("1", "a", 3), combinationFabrics: null }), [3]))
check("single: nothing selected", same(getSelectedGroupNumbers({ fabricGroupObject: null, fabricObject: null, combinationFabrics: null }), []))
// combination
check("combination: effective numbers, deduped", same(getSelectedGroupNumbers({
  fabricGroupObject: g3, fabricObject: fab("1", "a"),
  combinationFabrics: { 1: sel(g3, fab("1", "a", 1), 1), 2: sel(g3, fab("2", "b", 1), 2), 3: sel(group(2), fab("3", "c"), 3) },
}), [1, 2]))
check("combination: mixed override and default of same group", same(getSelectedGroupNumbers({
  fabricGroupObject: g3, fabricObject: fab("1", "a"),
  combinationFabrics: { 1: sel(g3, fab("1", "a", 1), 1), 2: sel(g3, fab("2", "b"), 2) },
}), [1, 3]))

// price follows effective category
const prices: any[] = [
  { price: 100, price_listId: 1, fabrice_price_category: { group_number: 1 } },
  { price: 300, price_listId: 1, fabrice_price_category: { group_number: 3 } },
]
const sfS = (f: any): any => ({ fabricGroupObject: g3, fabricObject: f, combinationFabrics: null })
check("price: override priced in cat 1", getPriceFromPriceCategories(sfS(fab("1", "a", 1)), prices) === 100)
check("price: default priced in cat 3", getPriceFromPriceCategories(sfS(fab("1", "a")), prices) === 300)

// display helper
check("getFabricGroupNumber fallback", getFabricGroupNumber(fab("1", "a"), 3) === 3 && getFabricGroupNumber(fab("1", "a", 1), 3) === 1 && getFabricGroupNumber(null, 3) === 3)
check("uniform override differs from default shows override (DIOPSID 3 -> 1)",
  getGroupDisplayCategory([fab("1", "a", 1), fab("2", "b", 1)], 3) === 1)
check("uniform default", getGroupDisplayCategory([fab("1", "a"), fab("2", "b")], 3) === 3)
check("mixed: first colour by name wins (override first)",
  getGroupDisplayCategory([fab("2", "zebra"), fab("1", "alpha", 1)], 3) === 1)
check("mixed: first colour by name wins (default first)",
  getGroupDisplayCategory([fab("1", "zebra", 1), fab("2", "alpha")], 3) === 3)
check("name falls back to code", getGroupDisplayCategory([fab("B", null, 2), fab("A", null)], 3) === 3)
check("empty -> default", getGroupDisplayCategory([], 3) === 3)
check("effective categories", same(getGroupEffectiveCategories([fab("1", "a", 1), fab("2", "b"), fab("3", "c", 1)], 3), [1, 3]))
const input = [fab("2", "zebra"), fab("1", "alpha", 1)]
getGroupDisplayCategory(input, 3)
check("display helper does not reorder input", input[0].code === "2")

// group sort uses displayed category
const cats = [
  { group_number: 3, fabric_groups: [{ id: 10, fabrics: [fab("1", "a", 1)] }, { id: 11, fabrics: [fab("2", "a")] }] },
  { group_number: 2, fabric_groups: [{ id: 12, fabrics: [fab("3", "a")] }] },
]
check("groups sorted by displayed category", same(buildSortedFabricGroups(cats).map((g) => g.id), [10, 12, 11]))

// pickDefaultFabric: drawer order, available > non-hidden > fabrics[0]
const pg = (id: number, n: number, fabrics: any[]) => ({ id, form_price_fabric_category: { group_number: n }, fabrics })
const av = (m: Record<number, any>) => (n: number | null) => (n == null ? "available" : m[n] ?? "available")
const pd1 = pickDefaultFabric([pg(1, 1, [fab("2", "zebra"), fab("1", "alpha")])], av({}))
check("default: drawer (name) order, not array order", pd1?.fabric.code === "1")
const pd2 = pickDefaultFabric([pg(1, 1, [fab("1", "alpha"), fab("2", "beta", 3)])], av({ 1: "hidden" }))
check("default: skips hidden colour via override", pd2?.fabric.code === "2")
const pd3 = pickDefaultFabric([pg(1, 1, [fab("1", "alpha")]), pg(2, 3, [fab("2", "beta")])], av({ 1: "disabled" }))
check("default: prefers available over disabled", pd3?.fabric.code === "2")
const pd4 = pickDefaultFabric([pg(1, 1, [fab("1", "alpha")])], av({ 1: "disabled" }))
check("default: non-hidden fallback", pd4?.fabric.code === "1")
const pd5 = pickDefaultFabric([pg(1, 1, [fab("2", "b"), fab("1", "a")])], av({ 1: "hidden" }))
check("default: all hidden -> fabrics[0]", pd5?.fabric.code === "2")

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1) }
console.log("\nAll checks passed")
