// Verification script for reconcileSelectedComponents.
// The project has no test runner (no jest/vitest, no test script), so this
// standalone script exercises the pure function on fixtures.
// Run with: pnpm exec sucrase-node scripts/verify-reconcile-components.ts
// Exits 0 when all cases pass, 1 otherwise.
import { isEqual } from "lodash"
import { reconcileSelectedComponents } from "../src/configurator/lib/group-logic"
import type {
  ComponentGroup,
  SelectedComponent,
  AdditionalComponent,
} from "../src/configurator/lib/types"

let failures = 0
function assert(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS: ${name}`)
  } else {
    failures++
    console.log(`  FAIL: ${name}`)
    if (extra !== undefined) console.log("    got:", JSON.stringify(extra))
  }
}

// Minimal component factory — only fields getValidComponents touches.
function comp(code: string, groupCode: string): AdditionalComponent {
  return {
    id: code.length, // arbitrary, unique-ish
    code,
    groupCode,
    conditions: null,
    dimensions: null,
    image: null,
    additional_component_profiles: [],
    price_fabric_category: [],
    extra_price: null,
    extra_prices: [],
  }
}

function group(code: string, codes: string[]): ComponentGroup {
  return {
    code,
    order: 0,
    additional_component_group_profiles: [],
    additional_components: codes.map((c) => comp(c, code)),
    // no hide_components_without_price → price filter is skipped
  }
}

function sel(comp_: AdditionalComponent): SelectedComponent {
  return { ...comp_, groupCode: comp_.groupCode! }
}

// A sofaCombinations entry whose module metadata constrains a group's codes.
function sofaModuleWithMetadata(metadata: Record<string, any>): any {
  return { attrs: { originalSofaForm: { metadata } } }
}

const noOptions = () => undefined

// =====================================================================
// CASE 1 — Burrow design-comfort: raw [2B4M, 2K3I], metadata allows only 2K3I
// =====================================================================
console.log("\nCASE 1: Burrow design-comfort metadata staleness")
{
  const designComfort = group("design-comfort", [
    "BURROW:2B4M",
    "BURROW:2K3I",
  ])
  // Stored (stale) selection = raw first component 2B4M, chosen while
  // sofaCombinations was empty.
  const stored: SelectedComponent[] = [
    sel(designComfort.additional_components[0]), // 2B4M
  ]
  // Now the sofa module is placed; its metadata only permits 2K3I.
  const sofaCombinations = [
    [
      sofaModuleWithMetadata({
        "design-comfort": [{ code: "BURROW:2K3I" }],
      }),
    ],
  ]

  const result = reconcileSelectedComponents(
    [designComfort],
    stored,
    sofaCombinations,
    noOptions
  )

  assert(
    "design-comfort reconciled to 2K3I",
    result.length === 1 && result[0].code === "BURROW:2K3I",
    result.map((r) => r.code)
  )
  assert(
    "groupCode preserved",
    result[0]?.groupCode === "design-comfort"
  )

  // Idempotency: a second pass yields the same result.
  const result2 = reconcileSelectedComponents(
    [designComfort],
    result,
    sofaCombinations,
    noOptions
  )
  assert(
    "idempotent: reconcile(reconcile(x)) === reconcile(x)",
    isEqual(result2, result),
    result2.map((r) => r.code)
  )
}

// =====================================================================
// CASE 2 — Empty valid set leaves the selection untouched
// =====================================================================
console.log("\nCASE 2: empty valid set leaves selection unchanged")
{
  const designComfort = group("design-comfort", ["BURROW:2B4M", "BURROW:2K3I"])
  const stored: SelectedComponent[] = [sel(designComfort.additional_components[0])]
  // Metadata permits a code that exists in NO raw component → valid set empty.
  const sofaCombinations = [
    [sofaModuleWithMetadata({ "design-comfort": [{ code: "BURROW:ZZZZ" }] })],
  ]

  const result = reconcileSelectedComponents(
    [designComfort],
    stored,
    sofaCombinations,
    noOptions
  )
  assert(
    "selection untouched when valid set is empty",
    isEqual(result, stored),
    result.map((r) => r.code)
  )
}

// =====================================================================
// CASE 3 — Condition-driven (onlyWithComponents) cross-group staleness.
// Proves the internal fixpoint: fixing the controller (group A) changes
// the dependent's (group B) valid set in the SAME reconcile call.
// =====================================================================
console.log("\nCASE 3: condition-driven cross-group fixpoint + idempotency")
{
  // Controller group A: model with raw [M_OLD, M_NEW], metadata forces M_NEW.
  const groupA = group("model", ["M_OLD", "M_NEW"])

  // Dependent group B: design with two components, each gated by which model
  // is selected via onlyWithComponents.
  const dWithOld = comp("D_FOR_OLD", "design")
  dWithOld.conditions = {
    onlyWithComponents: ["M_OLD"],
    onlyWithComponentsGroup: "model",
  }
  const dWithNew = comp("D_FOR_NEW", "design")
  dWithNew.conditions = {
    onlyWithComponents: ["M_NEW"],
    onlyWithComponentsGroup: "model",
  }
  const groupB: ComponentGroup = {
    code: "design",
    order: 1,
    additional_component_group_profiles: [],
    additional_components: [dWithOld, dWithNew],
  }

  // Stored: stale model M_OLD + design D_FOR_OLD (consistent before the change).
  const stored: SelectedComponent[] = [
    sel(groupA.additional_components[0]), // M_OLD
    sel(dWithOld), // D_FOR_OLD
  ]

  // Metadata now forces model = M_NEW.
  const sofaCombinations = [
    [sofaModuleWithMetadata({ model: [{ code: "M_NEW" }] })],
  ]

  const result = reconcileSelectedComponents(
    [groupA, groupB],
    stored,
    sofaCombinations,
    noOptions
  )

  // Pass 1 fixes model → M_NEW. With M_NEW selected, D_FOR_OLD's
  // onlyWithComponents (['M_OLD']) no longer matches → D_FOR_OLD invalid,
  // only D_FOR_NEW valid. Pass 2 fixes design → D_FOR_NEW.
  assert(
    "model reconciled to M_NEW",
    result.find((c) => c.groupCode === "model")?.code === "M_NEW"
  )
  assert(
    "design reconciled to D_FOR_NEW (dependent on fixed model)",
    result.find((c) => c.groupCode === "design")?.code === "D_FOR_NEW",
    result.map((r) => `${r.groupCode}:${r.code}`)
  )
  assert("order preserved", result[0].groupCode === "model" && result[1].groupCode === "design")

  // Idempotency across the cross-group dependency.
  const result2 = reconcileSelectedComponents(
    [groupA, groupB],
    result,
    sofaCombinations,
    noOptions
  )
  assert(
    "idempotent across cross-group dependency",
    isEqual(result2, result),
    result2.map((r) => `${r.groupCode}:${r.code}`)
  )
}

// =====================================================================
// CASE 4 — Already-valid selection is left exactly as-is.
// =====================================================================
console.log("\nCASE 4: already-valid selection unchanged")
{
  const designComfort = group("design-comfort", ["BURROW:2B4M", "BURROW:2K3I"])
  const stored: SelectedComponent[] = [sel(designComfort.additional_components[1])] // 2K3I
  const sofaCombinations = [
    [sofaModuleWithMetadata({ "design-comfort": [{ code: "BURROW:2K3I" }] })],
  ]
  const result = reconcileSelectedComponents(
    [designComfort],
    stored,
    sofaCombinations,
    noOptions
  )
  assert("valid selection kept", isEqual(result, stored), result.map((r) => r.code))
}

// =====================================================================
// CASE 5 — Single-entry customer mandatory pick (priceless) must be KEPT.
// Regression guard: when getOptionsForGroup returns no customerComponentCodes
// for the group (single-entry codes live in a separate Set), the price filter
// in getValidComponents would otherwise drop a priceless customer pick and the
// reconcile would replace it with a priced sibling. With the combined
// customer-code map the guard skips the price filter and the pick survives.
// =====================================================================
console.log("\nCASE 5: single-entry customer mandatory pick kept (priceless)")
{
  // Priceless mandatory pick.
  const mandatory = comp("CUST_PICK", "logos")
  // hide_components_without_price is on; mandatory has no price.
  const priced = comp("PRICED_SIBLING", "logos")
  priced.extra_price = 10

  const logos: ComponentGroup = {
    code: "logos",
    order: 0,
    hide_components_without_price: true,
    additional_component_group_profiles: [],
    additional_components: [mandatory, priced],
  }

  const stored: SelectedComponent[] = [sel(mandatory)]

  // getOptionsForGroup carrying the customer's code for this group → guard
  // skips the price filter, so the priceless mandatory stays valid.
  const getOptionsWithCustomerCode = (groupCode: string) =>
    groupCode === "logos"
      ? {
          showAllProducts: false,
          customerComponentCodesForGroup: new Set(["CUST_PICK"]),
        }
      : undefined

  const resultWithCode = reconcileSelectedComponents(
    [logos],
    stored,
    [],
    getOptionsWithCustomerCode
  )
  assert(
    "priceless mandatory pick kept when customer code is supplied",
    isEqual(resultWithCode, stored),
    resultWithCode.map((r) => r.code)
  )

  // Diagnostic: WITHOUT the customer code (the bug), the price filter would
  // drop the mandatory and reconcile would flip it to the priced sibling.
  const getOptionsNoCode = () => ({ showAllProducts: false })
  const resultNoCode = reconcileSelectedComponents(
    [logos],
    stored,
    [],
    getOptionsNoCode
  )
  console.log(
    "    (diagnostic) without customer code, reconcile yields:",
    resultNoCode.map((r) => r.code)
  )
}

// =====================================================================
// CASE 6 — Non-convergent onlyWithComponents 2-cycle has NO fixpoint.
// G1=[P,Q] and G2=[R,S] are coupled so that P requires G2∈{R}, Q requires
// G2∈{S}, R requires G1∈{P}, S requires G1∈{Q}. Starting from {P,S} (NOT a
// fixpoint) the snapshot passes oscillate forever:
//   {P,S} → {Q,R} → {P,S} → ... (period 2, no fixpoint).
// reconcileSelectedComponents must NOT return a cycled snapshot (that array
// genuinely differs from the input and the caller's isEqual guard would keep
// dispatching → infinite render loop). Instead it must return the ORIGINAL
// input REFERENCE unchanged, so the caller's isEqual guard short-circuits and
// nothing is dispatched (degrade to stale-persists).
// =====================================================================
console.log("\nCASE 6: non-convergent onlyWithComponents 2-cycle returns input unchanged")
{
  // Group G1 = [P, Q], each gated on which member of G2 is selected.
  const p = comp("P", "g1")
  p.conditions = { onlyWithComponents: ["R"], onlyWithComponentsGroup: "g2" }
  const q = comp("Q", "g1")
  q.conditions = { onlyWithComponents: ["S"], onlyWithComponentsGroup: "g2" }
  const g1: ComponentGroup = {
    code: "g1",
    order: 0,
    additional_component_group_profiles: [],
    additional_components: [p, q],
  }

  // Group G2 = [R, S], each gated on which member of G1 is selected.
  const r = comp("R", "g2")
  r.conditions = { onlyWithComponents: ["P"], onlyWithComponentsGroup: "g1" }
  const s = comp("S", "g2")
  s.conditions = { onlyWithComponents: ["Q"], onlyWithComponentsGroup: "g1" }
  const g2: ComponentGroup = {
    code: "g2",
    order: 1,
    additional_component_group_profiles: [],
    additional_components: [r, s],
  }

  // Stored {P, S} is self-inconsistent: with S selected in g2, P is invalid in
  // g1 (P needs g2∈{R}); with P selected in g1, S is invalid in g2 (S needs
  // g1∈{Q}). Every pass flips both → no fixpoint.
  const stored: SelectedComponent[] = [sel(p), sel(s)]

  const result = reconcileSelectedComponents([g1, g2], stored, [], noOptions)

  // The discriminating check: on non-convergence the function must hand back
  // the input REFERENCE (not a freshly-mapped cycled snapshot), so the caller's
  // `isEqual(reconciled, selectedAdditionalComponents)` guard suppresses the
  // dispatch. A cycled `.map()` result would be !== stored and trigger a loop.
  assert(
    "non-convergent cycle returns the original input reference",
    result === stored,
    result.map((r) => `${r.groupCode}:${r.code}`)
  )
  assert(
    "non-convergent cycle leaves selection unchanged (no dispatch)",
    isEqual(result, stored),
    result.map((r) => `${r.groupCode}:${r.code}`)
  )
}

console.log(
  failures === 0
    ? "\nAll reconcile cases passed."
    : `\n${failures} reconcile case(s) FAILED.`
)
process.exit(failures === 0 ? 0 : 1)
