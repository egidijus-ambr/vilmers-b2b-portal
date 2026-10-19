import type {
  AdditionalComponent,
  ComponentConditions,
  SelectedComponent,
  SelectedFabricState,
} from "./types"

/**
 * Normalise a fabric group code for comparison: AX writes "11-141", our
 * FabricGroup.code is "11141". Strip dashes and whitespace on both sides.
 */
export function normalizeFabricGroupCode(code: string | null | undefined): string {
  return (code ?? "").replace(/[-\s]/g, "")
}

/**
 * Collect the normalised fabric group codes of EVERY selected material: the
 * main fabric plus each combination fabric. Sorted + de-duplicated so the
 * result is deterministic (safe to use as a stable effect key via join).
 * Empty array = no fabric selected yet (rules then pass).
 */
export function collectFabricGroupCodes(
  selectedFabric: SelectedFabricState | null | undefined
): string[] {
  if (!selectedFabric) return []
  const codes = new Set<string>()
  const add = (code: string | null | undefined) => {
    const n = normalizeFabricGroupCode(code)
    if (n) codes.add(n)
  }
  add(selectedFabric.fabricGroupObject?.code)
  for (const entry of Object.values(selectedFabric.combinationFabrics ?? {})) {
    add(entry?.fabricGroupObject?.code)
  }
  return Array.from(codes).sort()
}

/** Legacy onlyWithComponents check (unchanged behaviour). */
function passesLegacy(
  conditions: ComponentConditions,
  selectedComponents: SelectedComponent[]
): boolean {
  const { onlyWithComponents, onlyWithComponentsGroup } = conditions
  if (!onlyWithComponents || !onlyWithComponentsGroup) return true
  return selectedComponents
    .filter((c) => c.groupCode?.startsWith(onlyWithComponentsGroup))
    .every((c) => onlyWithComponents.includes(c.code))
}

/** Fabric rules: apply to every selected material. Unknown rule types pass. */
export function passesFabricRules(
  conditions: ComponentConditions | null | undefined,
  fabricGroupCodes: string[] | undefined
): boolean {
  const rules = conditions?.rules
  if (!Array.isArray(rules) || rules.length === 0) return true
  if (!fabricGroupCodes || fabricGroupCodes.length === 0) return true
  for (const rule of rules) {
    if (!rule || rule.type !== "fabricGroup") continue // forward compatible
    const codes = Array.isArray(rule.codes)
      ? rule.codes.map(normalizeFabricGroupCode)
      : []
    if (rule.op === "in") {
      if (!fabricGroupCodes.every((c) => codes.includes(c))) return false
    } else if (rule.op === "notIn") {
      if (fabricGroupCodes.some((c) => codes.includes(c))) return false
    }
  }
  return true
}

/**
 * Effective conditions = component-level AND per-product join level.
 * `component.conditions` is the join row; `component.componentConditions` is
 * AdditionalComponent.conditions.
 */
export function passesConditions(
  component: Pick<AdditionalComponent, "conditions" | "componentConditions">,
  selectedComponents: SelectedComponent[],
  fabricGroupCodes?: string[]
): boolean {
  for (const cond of [component.componentConditions, component.conditions]) {
    if (!cond) continue
    if (!passesLegacy(cond, selectedComponents)) return false
    if (!passesFabricRules(cond, fabricGroupCodes)) return false
  }
  return true
}
