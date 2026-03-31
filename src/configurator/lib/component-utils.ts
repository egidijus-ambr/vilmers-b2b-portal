import type {
  ComponentGroup,
  AdditionalComponent,
  SelectedComponent,
  StepId,
  StepDefinition,
} from "./types"

/**
 * Merge manufacturer-level component groups with per-product associations.
 *
 * manufacturerGroups: from data.manufacturer.additional_component_groups
 * productAssociations: from data.advanced_product.additional_component_to_advanced_product
 *   Each has: { additional_component: { id }, extra_price, extra_prices: [{ price }],
 *              price_fabric_category, conditions, isDefault, metadata, enabled }
 * priceListId: to resolve extra_prices
 */
export function mergeComponentGroups(
  manufacturerGroups: any[],
  productAssociations: any[],
  priceListId: number
): ComponentGroup[] {
  // Build lookup: component.id → product association data
  const associationMap = new Map<number, any>()
  for (const assoc of productAssociations) {
    if (assoc.enabled && assoc.additional_component?.id) {
      associationMap.set(assoc.additional_component.id, assoc)
    }
  }

  const mergedGroups: ComponentGroup[] = []

  for (const group of manufacturerGroups) {
    // Filter components to only those enabled for this product
    const enabledComponents: AdditionalComponent[] = []

    for (const component of group.additional_components ?? []) {
      const assoc = associationMap.get(component.id)
      if (!assoc) continue // Not enabled for this product

      // Resolve extra_price from extra_prices for the given priceListId
      let resolvedExtraPrice = assoc.extra_price ?? 0
      if (assoc.extra_prices?.length > 0) {
        const priceEntry = assoc.extra_prices[0] // Already filtered by priceListId in query
        if (priceEntry?.price != null) {
          resolvedExtraPrice = priceEntry.price
        }
      }

      enabledComponents.push({
        ...component,
        extra_price: resolvedExtraPrice,
        price_fabric_category: assoc.price_fabric_category ?? [],
        conditions: assoc.conditions ?? null,
        isDefault: assoc.isDefault ?? false,
        groupCode: group.code,
        additionalComponentGroupId: group.id,
        metadata: assoc.metadata ?? null,
      })
    }

    if (enabledComponents.length === 0) continue

    // Sort: defaults first, then by code
    enabledComponents.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      return (a.code ?? "").localeCompare(b.code ?? "")
    })

    mergedGroups.push({
      ...group,
      additional_components: enabledComponents,
    })
  }

  // Sort groups by order
  mergedGroups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return mergedGroups
}

/**
 * Filter components within a group based on conditions and pricing.
 * Ported from storefront additionalComponentUtils.ts.
 */
export function getValidComponents(
  group: ComponentGroup,
  selectedComponents: SelectedComponent[]
): AdditionalComponent[] {
  // Filter out components hidden in configuration (customer preselected / locked)
  let filtered = group.additional_components.filter((component: any) => {
    const metadata = (component as any).metadata
    if (metadata?.hidden_in_configuration === true) return false
    return true
  })

  // Filter by conditions.onlyWithComponents
  filtered = filtered.filter((component) => {
    if (!component.conditions?.onlyWithComponents) return true

    const { onlyWithComponents, onlyWithComponentsGroup } = component.conditions
    if (!onlyWithComponents || !onlyWithComponentsGroup) return true

    const selectedInGroup = selectedComponents
      .filter((c) => c.groupCode?.startsWith(onlyWithComponentsGroup))
      .map((c) => c.code)

    return selectedInGroup.every((code) => onlyWithComponents.includes(code))
  })

  // Filter by price if hide_components_without_price
  if (group.hide_components_without_price) {
    filtered = filtered.filter((component) => {
      // Always keep "no option" (code '0')
      if (component.code === "0") return true

      const hasExtraPrice =
        component.extra_price != null && component.extra_price > 0

      if (!group.use_fabric_prices_for_components) {
        return hasExtraPrice
      }

      const hasFabricPrice =
        Array.isArray(component.price_fabric_category) &&
        component.price_fabric_category.some(
          (cat) => cat.price != null && cat.price > 0
        )

      return hasFabricPrice || hasExtraPrice
    })
  }

  return filtered
}

/**
 * Categorize a component group code into a step.
 */
export function categorizeStep(groupCode: string): StepId {
  if (groupCode.startsWith("armrest") || groupCode.startsWith("legs")) {
    return "armrest-legs"
  }
  if (groupCode.startsWith("threads")) {
    return "threads"
  }
  return "design"
}

const STEP_ORDER: StepId[] = ["fabric", "armrest-legs", "design", "threads"]
const STEP_LABELS: Record<StepId, string> = {
  fabric: "Fabrics",
  "armrest-legs": "Armrest & Legs",
  design: "Design & Comfort",
  threads: "Threads",
}

/**
 * Compute which steps should be shown for this product.
 * Fabric step is always included. Other steps only if they have visible groups.
 */
export function getStepsForProduct(
  componentGroups: ComponentGroup[],
  selectedComponents: SelectedComponent[]
): StepDefinition[] {
  // Categorize groups into steps
  const stepGroups = new Map<StepId, ComponentGroup[]>()

  for (const group of componentGroups) {
    const stepId = categorizeStep(group.code)

    // Skip hidden groups for step visibility
    if (group.ui_type === "hidden") continue

    // Check if group has >1 valid component
    const validComponents = getValidComponents(group, selectedComponents)
    if (validComponents.length <= 1) continue

    if (!stepGroups.has(stepId)) {
      stepGroups.set(stepId, [])
    }
    stepGroups.get(stepId)!.push(group)
  }

  // Build ordered steps
  const steps: StepDefinition[] = [
    { id: "fabric", label: STEP_LABELS.fabric, groups: [] },
  ]

  for (const stepId of STEP_ORDER) {
    if (stepId === "fabric") continue
    const groups = stepGroups.get(stepId)
    if (groups && groups.length > 0) {
      const sortedGroups = groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      const groupNames = sortedGroups
        .map((g) => g.additional_component_group_profiles?.[0]?.name)
        .filter(Boolean)
      const label =
        groupNames.length > 0
          ? [...new Set(groupNames)].join(" & ")
          : STEP_LABELS[stepId]
      steps.push({ id: stepId, label, groups: sortedGroups })
    }
  }

  return steps
}

/**
 * Get component name from profiles by language.
 */
export function getComponentName(
  component: AdditionalComponent,
  languageCode: string
): string {
  const profile =
    component.additional_component_profiles?.find(
      (p) => p.language === languageCode
    ) ?? component.additional_component_profiles?.[0]
  return profile?.name ?? component.code ?? `Component ${component.id}`
}

/**
 * Get group name from profiles or nameOverride.
 */
export function getGroupName(
  group: ComponentGroup,
  languageCode: string
): string {
  if (group.nameOverride && typeof group.nameOverride === "string") {
    return group.nameOverride
  }
  const profile =
    group.additional_component_group_profiles?.find(
      (p) => p.language === languageCode
    ) ?? group.additional_component_group_profiles?.[0]
  return profile?.name ?? group.code ?? `Group`
}
