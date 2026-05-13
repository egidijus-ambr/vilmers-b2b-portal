import type {
  ComponentGroup,
  AdditionalComponent,
  SelectedComponent,
  StepId,
  StepDefinition,
} from "./types"
import { isHidden } from "./ui-type"
import { MODEL_CODE, MODEL_CODE_OTHER } from "./vilmers"

/**
 * Options accepted by getValidComponents to make pricelist-aware filtering
 * possible without breaking existing call sites.
 *
 *   - priceListIds: set of pricelist IDs the customer is priced under
 *     (direct + group). When provided, the `hide_components_without_price`
 *     branch restricts fabric-price matching to these pricelists.
 *   - showAllProducts: sales-manager mode — skip the price-based filter
 *     entirely. Components with NO price are still kept so a manager can
 *     review all configuration options.
 *
 * Both are optional; when omitted the function falls back to the previous
 * "any non-zero price" behaviour.
 */
export interface ValidComponentsOptions {
  priceListIds?: number[]
  showAllProducts?: boolean
}

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
  selectedComponents: SelectedComponent[],
  sofaCombinations?: any[][],
  options?: ValidComponentsOptions
): AdditionalComponent[] {
  let filtered = [...group.additional_components]

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

  // Filter by sofa module metadata (generic metadata[groupCode] filtering)
  // For each sofa module, check if metadata has a key matching this group's code.
  // If so, only show components whose code is in the metadata array.
  // Combines across modules using intersection (default) or union.
  // Skip groups already handled by specialized logic (armrests, legs, threads).
  if (sofaCombinations && sofaCombinations.length > 0) {
    const isSpecializedGroup =
      group.code.startsWith("armrest") ||
      group.code.startsWith("threads")

    if (!isSpecializedGroup) {
      let supportedCodes: string[] | undefined

      for (const sofaSet of sofaCombinations) {
        for (const module of sofaSet) {
          const metadata = module?.attrs?.originalSofaForm?.metadata
          const moduleSupportedComponents = metadata?.[group.code]

          if (!moduleSupportedComponents || !Array.isArray(moduleSupportedComponents)) continue

          const moduleCodes: string[] = moduleSupportedComponents.map(
            (c: any) => c.code ?? c
          )

          if (supportedCodes === undefined) {
            supportedCodes = [...moduleCodes]
          } else {
            const operation = metadata?.["operation_" + group.code]

            if (operation === "union") {
              const combined = [...supportedCodes, ...moduleCodes]
              supportedCodes = combined.filter(
                (code, index) => combined.indexOf(code) === index
              )
            } else {
              // Intersection (default): keep only codes present in both
              supportedCodes = supportedCodes.filter((code) =>
                moduleCodes.includes(code)
              )
            }
          }
        }
      }

      if (supportedCodes !== undefined) {
        filtered = filtered.filter((component) =>
          supportedCodes!.includes(component.code)
        )
      }
    }
  }

  // Filter by price if hide_components_without_price.
  // In showAllProducts (sales-manager) mode we skip this filter entirely so
  // managers see every configuration option even when un-priced.
  if (group.hide_components_without_price && !options?.showAllProducts) {
    const priceListIds = options?.priceListIds
    const hasPriceListFilter = Array.isArray(priceListIds)
    const priceListIdSet = hasPriceListFilter ? new Set(priceListIds) : null

    filtered = filtered.filter((component) => {
      // Always keep "no option" (code '0')
      if (component.code === "0") return true

      // extra_price has no pricelist dimension on the component-association
      // row itself (the GraphQL query already filters extra_prices by the
      // primary priceListId before merging into extra_price). Treat it as
      // pricelist-agnostic — a positive value means the customer is charged
      // something extra.
      const hasExtraPrice =
        component.extra_price != null && component.extra_price > 0

      if (group.use_fabric_prices_for_components === false) {
        return hasExtraPrice
      }

      const hasFabricPrice =
        Array.isArray(component.price_fabric_category) &&
        component.price_fabric_category.some((cat) => {
          if (cat.price == null || cat.price <= 0) return false
          // If callers gave us a pricelist set, the entry must match it.
          // No set → preserve legacy "any positive entry" behaviour.
          if (priceListIdSet) {
            return priceListIdSet.has(cat.price_listId)
          }
          return true
        })

      return hasFabricPrice || hasExtraPrice
    })
  }

  // Deduplicate components by code (keep first occurrence)
  const seenCodes = new Set<string>()
  filtered = filtered.filter((component) => {
    if (seenCodes.has(component.code)) return false
    seenCodes.add(component.code)
    return true
  })

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
  if (
    groupCode.startsWith("logo") ||
    groupCode === "shooting" ||
    groupCode === "direction"
  ) {
    return "other"
  }
  return "design"
}

const STEP_ORDER: StepId[] = ["sofa-modules", "fabric", "threads", "armrest-legs", "design", "other"]
const STEP_LABELS: Record<StepId, string> = {
  "sofa-modules": "Sofa Modules",
  fabric: "Fabrics",
  threads: "Threads",
  "armrest-legs": "Armrest & Legs",
  design: "Design & Comfort",
  logo: "Logo",
  other: "Other",
}

/**
 * Compute which steps should be shown for this product.
 * Fabric and threads steps are only included when hasFabricSelection is true
 * (i.e. advanced_product_type is SOFA or OTHER_WITH_FABRICS).
 * Other steps only if they have visible groups.
 */
export function getStepsForProduct(
  componentGroups: ComponentGroup[],
  selectedComponents: SelectedComponent[],
  sofaCombinations?: any[][],
  isSofa?: boolean,
  hasFabricSelection?: boolean,
  customerComponentGroupCodes?: Set<string>,
  options?: ValidComponentsOptions
): StepDefinition[] {
  // Categorize groups into steps
  const stepGroups = new Map<StepId, ComponentGroup[]>()

  for (const group of componentGroups) {
    const stepId = categorizeStep(group.code)

    // Skip hidden groups for step visibility
    if (isHidden(group.ui_type)) continue

    // Skip groups where customer has a pre-selected component
    if (customerComponentGroupCodes?.has(group.code)) continue

    // Check if group has >1 valid component
    const validComponents = getValidComponents(
      group,
      selectedComponents,
      sofaCombinations,
      options
    )
    if (validComponents.length <= 1) continue

    if (!stepGroups.has(stepId)) {
      stepGroups.set(stepId, [])
    }
    stepGroups.get(stepId)!.push(group)
  }

  // Build ordered steps
  const steps: StepDefinition[] = []

  // For sofa products: sofa-modules → fabric → threads → armrest-legs → design → logo
  // For non-sofa products: design → armrest-legs → logo (fabric/threads only if hasFabricSelection)
  const baseStepIds: StepId[] = isSofa
    ? ["sofa-modules", "fabric", "threads", "armrest-legs", "design", "other"]
    : ["design", "fabric", "threads", "armrest-legs", "other"]

  // Filter out fabric and threads steps when hasFabricSelection is false
  const orderedStepIds = hasFabricSelection === false
    ? baseStepIds.filter((id) => id !== "fabric" && id !== "threads")
    : baseStepIds

  for (const stepId of orderedStepIds) {
    if (stepId === "sofa-modules") {
      steps.push({ id: "sofa-modules", label: STEP_LABELS["sofa-modules"], groups: [] })
      continue
    }
    if (stepId === "fabric") {
      steps.push({ id: "fabric", label: STEP_LABELS.fabric, groups: [] })
      continue
    }
    const groups = stepGroups.get(stepId)
    if (groups && groups.length > 0) {
      const sortedGroups = groups.sort((a, b) => {
        const aIsModel = a.code.startsWith("model") ? 0 : 1
        const bIsModel = b.code.startsWith("model") ? 0 : 1
        if (aIsModel !== bIsModel) return aIsModel - bIsModel
        return (a.order ?? 0) - (b.order ?? 0)
      })
      const groupNames = sortedGroups
        .map((g) => g.additional_component_group_profiles?.[0]?.name)
        .filter(Boolean)
      let label: string
      if (stepId === "other" && sortedGroups.length > 1) {
        label = STEP_LABELS.other
      } else if (groupNames.length > 0) {
        label = [...new Set(groupNames)].join(" & ")
      } else {
        label = STEP_LABELS[stepId]
      }
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
 * Get component description from profiles by language.
 */
export function getComponentDescription(
  component: AdditionalComponent,
  languageCode: string
): string | null {
  const profile =
    component.additional_component_profiles?.find(
      (p) => p.language === languageCode
    ) ?? component.additional_component_profiles?.[0]
  return profile?.description ?? null
}

/**
 * Required component groups — when these groups have at least one visible
 * component the user MUST pick one before checkout. Empty/hidden groups are
 * exempt (a sales view with everything filtered out should not block).
 */
const REQUIRED_GROUP_CODES: ReadonlySet<string> = new Set([
  MODEL_CODE,
  MODEL_CODE_OTHER,
])

/**
 * Returns the codes of required groups (model, model-other) that have at
 * least one user-selectable component but no selection yet. Empty array
 * means everything required has either been chosen or is not visible —
 * add-to-cart should be allowed.
 *
 * IMPORTANT: `groups` MUST be the visible/filtered set the user actually
 * sees in the UI. The raw `state.additionalComponentGroups` is NOT enough
 * because the `hide_components_without_price` filter only runs inside
 * `getValidComponents`. Callers should pre-filter, e.g.:
 *
 *   const visibleGroups = state.additionalComponentGroups.map((g) => ({
 *     ...g,
 *     additional_components: getValidComponents(g, selected, sofa, opts),
 *   }))
 *
 * The "no option" placeholder (`code === "0"`) is intentionally excluded
 * from the selectability check — selecting it is treated as "no selection".
 */
export function getMissingRequiredGroupCodes(
  groups: ComponentGroup[],
  selectedComponents: SelectedComponent[]
): string[] {
  const missing: string[] = []
  for (const group of groups) {
    if (!REQUIRED_GROUP_CODES.has(group.code)) continue
    const selectable = (group.additional_components ?? []).filter(
      (c) => c.code !== "0"
    )
    if (selectable.length === 0) continue
    const hasSelection = selectedComponents.some(
      (c) => c.groupCode === group.code && c.code !== "0"
    )
    if (!hasSelection) missing.push(group.code)
  }
  return missing
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
