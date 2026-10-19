// Verification script for fabric-aware component conditions.
// No test runner in this repo; run with: yarn verify:fabric-conditions
// Exits 0 when all cases pass, 1 otherwise.
import {
  collectFabricGroupCodes,
  passesConditions,
  normalizeFabricGroupCode,
} from "../src/configurator/lib/component-conditions"
import { reconcileSelectedComponents } from "../src/configurator/lib/group-logic"
import { getValidComponents } from "../src/configurator/lib/component-utils"
import type {
  AdditionalComponent,
  ComponentGroup,
  SelectedComponent,
} from "../src/configurator/lib/types"

let failures = 0
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  PASS: ${name}`)
  else {
    failures++
    console.log(`  FAIL: ${name}`)
    if (extra !== undefined) console.log("    got:", JSON.stringify(extra))
  }
}

function comp(code: string, groupCode: string, extra: Partial<AdditionalComponent> = {}): AdditionalComponent {
  return {
    id: 1, code, groupCode, conditions: null, dimensions: null, image: null,
    additional_component_profiles: [], price_fabric_category: [], extra_price: null,
    extra_prices: [], ...extra,
  }
}
const fg = (code: string): any => ({ code })
const fabricState = (main: string | null, combo: string[] = []): any => ({
  fabricGroupObject: main ? fg(main) : null,
  fabricObject: null,
  combinationFabrics: combo.length
    ? Object.fromEntries(combo.map((c, i) => [String(i), { fabricGroupObject: fg(c) }]))
    : null,
})

const inRule = { rules: [{ type: "fabricGroup", op: "in", codes: ["11-141", "13002"] }] } as any
const notInRule = { rules: [{ type: "fabricGroup", op: "notIn", codes: ["11141"] }] } as any

console.log("\nnormalise + collect")
assert("normalise", normalizeFabricGroupCode(" 11-141 ") === "11141")
assert("collect main + combo, dedup, sorted",
  collectFabricGroupCodes(fabricState("13-002", ["11141", "13002"])).join() === "11141,13002")
assert("no fabric -> []", collectFabricGroupCodes(fabricState(null)).length === 0)

console.log("\npassesConditions")
const c1 = comp("10", "threads-type", { componentConditions: inRule })
assert("in: allowed fabric passes", passesConditions(c1, [], ["11141"]))
assert("in: other fabric fails", !passesConditions(c1, [], ["99999"]))
assert("in: every material must be listed", !passesConditions(c1, [], ["11141", "99999"]))
assert("in: all listed passes", passesConditions(c1, [], ["11141", "13002"]))
assert("no fabric -> pass", passesConditions(c1, [], []))
const c2 = comp("10", "threads-type", { conditions: notInRule })
assert("notIn: listed fails", !passesConditions(c2, [], ["99999", "11141"]))
assert("notIn: none listed passes", passesConditions(c2, [], ["99999"]))
const c3 = comp("10", "threads-type", { componentConditions: { rules: [{ type: "future", x: 1 }] } as any })
assert("unknown rule type passes", passesConditions(c3, [], ["99999"]))
const legacy = comp("x", "g", { conditions: { onlyWithComponents: ["10"], onlyWithComponentsGroup: "threads-type" } })
const sel10 = [comp("10", "threads-type")] as SelectedComponent[]
const sel0 = [comp("0", "threads-type")] as SelectedComponent[]
assert("legacy still ok", passesConditions(legacy, sel10) && !passesConditions(legacy, sel0))
assert("legacy at component level evaluated too",
  !passesConditions(comp("x", "g", { componentConditions: legacy.conditions }), sel0))
assert("component AND join", !passesConditions(
  comp("10", "t", { componentConditions: inRule, conditions: notInRule }), [], ["11141"]))

console.log("\nreconcile on fabric switch")
const threads: ComponentGroup = {
  code: "threads-type", order: 0, additional_component_group_profiles: [],
  additional_components: [comp("0", "threads-type"), comp("10", "threads-type", { componentConditions: inRule })],
} as any
const colors: ComponentGroup = {
  code: "threads-colors", order: 1, additional_component_group_profiles: [],
  additional_components: [comp("RED", "threads-colors", { conditions: { onlyWithComponents: ["10"], onlyWithComponentsGroup: "threads-type" } })],
} as any
const stored = [
  { ...threads.additional_components[1], groupCode: "threads-type" },
  { ...colors.additional_components[0], groupCode: "threads-colors" },
] as SelectedComponent[]
const opts = (codes: string[]) => () => ({ fabricGroupCodes: codes })
const ok = reconcileSelectedComponents([threads, colors], stored, [], opts(["11141"]))
assert("allowed fabric keeps 10", ok[0].code === "10")
const bad = reconcileSelectedComponents([threads, colors], stored, [], opts(["99999"]))
assert("disallowed fabric -> 0", bad[0].code === "0", bad.map((c) => c.code))
assert("colour group has no valid components after", getValidComponents(colors, bad, [], { fabricGroupCodes: ["99999"] }).length === 0)
const again = reconcileSelectedComponents([threads, colors], bad, [], opts(["99999"]))
assert("idempotent", JSON.stringify(again) === JSON.stringify(bad))

console.log(failures ? `\n${failures} FAILED` : "\nAll passed")
process.exit(failures ? 1 : 0)
