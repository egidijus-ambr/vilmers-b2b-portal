// Ported from furnibay-frontend-shop AdvancedSofaV2.tsx (lines 221-585)
// Pure functions — no Apollo, no MUI, no React dependencies.

import { isEqual } from "lodash"
import type {
  ComponentGroup,
  SelectedComponent,
  SelectedFabricState,
} from "./types"
import { getValidComponents } from "./component-utils"

/** Extract leg codes from metadata.legs which can be objects or strings */
function extractLegCodes(legs: any[]): string[] {
  return legs.map((leg: any) => leg.code ?? leg)
}

// =============================================
// Thread-Color Group Logic
// =============================================

/**
 * Compute dynamic thread-color groups based on contrast stitching selection.
 *
 * If contrast stitching is selected (threads-type code '10'), we create
 * one thread-colors group per fabric in the combination.
 * Otherwise, collapse to a single thread-colors group.
 *
 * Ported from AdvancedSofaV2 lines 221-306.
 */
export function computeThreadGroups(
  currentGroups: ComponentGroup[],
  originalGroups: ComponentGroup[],
  selectedComponents: SelectedComponent[],
  selectedFabric: SelectedFabricState,
  translateFn: (key: string) => string
): ComponentGroup[] {
  const isContrastStitchingSelected = selectedComponents.some(
    (c) => c.groupCode === "threads-type" && c.code === "10"
  )

  const fabrics: any[] = Object.values(
    selectedFabric?.combinationFabrics ?? {}
  ).sort((a: any, b: any) => a.option.code.localeCompare(b.option.code))

  const fabricsCount = fabrics.length

  if (isContrastStitchingSelected && fabricsCount > 0) {
    const threadColorGroups = currentGroups.filter((g) =>
      g.code.startsWith("threads-colors")
    )

    if (threadColorGroups.length !== fabricsCount) {
      // Remove existing thread-colors groups
      let modified = currentGroups.filter(
        (g) => !g.code.startsWith("threads-colors")
      )

      // Find the original thread-colors template group
      const threadGroup = originalGroups.find((g) =>
        g.code.startsWith("threads-colors")
      )
      if (!threadGroup) return currentGroups

      // Create one group per fabric in the combination
      for (let i = 0; i < fabricsCount; i++) {
        const newGroupCode = "threads-colors-" + i
        const nameOverride =
          translateFn("threads-for-fabric") + " " + fabrics[i].option.code

        const newGroup: ComponentGroup = {
          ...threadGroup,
          code: newGroupCode,
          nameOverride,
          order: threadGroup.order + (i + 1) * 0.1,
          additional_components: threadGroup.additional_components.map(
            (component) => ({
              ...component,
              groupCode: newGroupCode,
              groupNameOverride: nameOverride,
            })
          ),
        }
        modified.push(newGroup)
      }

      return modified
    }
  } else {
    // Remove duplicate thread-colors groups, keep only the first
    let foundThreadColor = false
    return currentGroups.filter((group) => {
      if (group.code?.startsWith("threads-colors")) {
        if (foundThreadColor) return false
        foundThreadColor = true
      }
      return true
    })
  }

  return currentGroups
}

// =============================================
// Armrest & Legs Group Logic
// =============================================

interface ModuleWithArmrest {
  name: string
  code: string
  armrestPosition: string
  armrestsConditions?: string[]
  sofaModuleId: string
  legs?: string[]
  armrests_legs_map?: Record<string, string[]>
}

/**
 * Compute dynamic armrest and legs groups based on sofa module selections.
 *
 * For each sofa module with an armrest position (L, R, LR), creates a
 * per-module armrest group. Also handles per-module legs groups when
 * different armrests have different leg compatibility.
 *
 * Ported from AdvancedSofaV2 lines 308-585.
 */
export function computeArmrestAndLegsGroups(
  currentGroups: ComponentGroup[],
  originalGroups: ComponentGroup[],
  sofaCombinations: any[][],
  selectedComponents: SelectedComponent[],
  translateFn: (key: string) => string,
  sofaForms?: any[]
): ComponentGroup[] {
  const armrestsGroup = originalGroups.find((g) => g.code === "armrest")
  if (!armrestsGroup) return currentGroups

  // Collect all modules that have armrests
  const modelWithArmrestInUse: ModuleWithArmrest[] = []

  for (const sofaSet of sofaCombinations) {
    for (const sofaModule of sofaSet) {
      const armrestPosition = sofaModule?.attrs?.armrestPosition
      if (!armrestPosition || armrestPosition === "NONE") continue

      const originalForm = sofaModule.attrs.originalSofaForm
      if (!originalForm) continue

      const positions = armrestPosition === "LR" ? ["LR"] :
        armrestPosition === "L" ? ["L"] :
          armrestPosition === "R" ? ["R"] : []

      for (const pos of positions) {
        modelWithArmrestInUse.push({
          name: originalForm.name,
          code: originalForm.code,
          armrestPosition: pos,
          armrestsConditions: originalForm.metadata?.armrestsConditions,
          sofaModuleId: sofaModule.attrs.id,
          legs: originalForm.metadata?.legs,
          armrests_legs_map: originalForm.metadata?.armrests_legs_map,
        })
      }
    }
  }

  // Remove all existing armrest and per-module legs groups
  let modified = currentGroups.filter(
    (g) => !g.code.startsWith("armrest") && !g.code.startsWith("legs-") && g.code !== "legs"
  )

  // Create per-module armrest groups
  modelWithArmrestInUse
    .sort((a, b) => a.sofaModuleId.localeCompare(b.sofaModuleId))
    .forEach((model, i) => {
      const newGroupCode = "armrest-" + model.code
      const nameOverride =
        translateFn("armrest-for-module") +
        " " +
        model.name +
        " " +
        model.armrestPosition

      const newArmrestsGroup: ComponentGroup = {
        ...armrestsGroup,
        code: newGroupCode,
        nameOverride,
        order: armrestsGroup.order + (i + 1) * 0.1,
        additional_components: armrestsGroup.additional_components
          .map((component) => ({
            ...component,
            groupCode: newGroupCode,
            groupNameOverride: nameOverride,
            moduleId: model.sofaModuleId,
          }))
          .filter((component) => {
            if (model.armrestsConditions && model.armrestsConditions.length > 0) {
              return model.armrestsConditions.includes(component.code)
            }
            return true
          }),
      }
      modified.push(newArmrestsGroup)
    })

  // Handle legs groups
  if (modelWithArmrestInUse.length > 1) {
    // Multiple modules — check if legs match across armrests
    const selectedArmrests = selectedComponents.filter((c) =>
      c.groupCode?.startsWith("armrest-")
    )

    // Get legs for the first armrest
    const firstArmCode = selectedArmrests[0]?.code
    const firstModuleId = selectedArmrests[0]?.groupCode?.split("armrest-")[1]
    const firstModel = modelWithArmrestInUse.find((m) => m.code === firstModuleId)
    const firstLegs = firstModel?.armrests_legs_map?.[firstArmCode] ?? []

    let allArmrestsLegsSetsAreEqual = true
    for (const armrest of selectedArmrests) {
      const moduleId = armrest.groupCode?.split("armrest-")[1]
      const model = modelWithArmrestInUse.find((m) => m.code === moduleId)
      const modelLegs = model?.armrests_legs_map?.[armrest.code] ?? []
      if (!isEqual([...firstLegs].sort(), [...modelLegs].sort())) {
        allArmrestsLegsSetsAreEqual = false
        break
      }
    }

    if (!allArmrestsLegsSetsAreEqual) {
      // Create per-module legs groups
      const legsGroup = originalGroups.find((g) => g.code === "legs")
      if (legsGroup) {
        modelWithArmrestInUse
          .sort((a, b) => a.sofaModuleId.localeCompare(b.sofaModuleId))
          .forEach((model, i) => {
            const selectedArm = selectedArmrests.find(
              (a) => a.groupCode === "armrest-" + model.code
            )
            if (!selectedArm) return

            const newGroupCode = "legs-" + model.code
            if (modified.some((g) => g.code === newGroupCode)) return

            const nameOverride =
              translateFn("leg-for-module") +
              " " +
              model.name +
              " " +
              model.armrestPosition

            const filteredComponents = legsGroup.additional_components.filter(
              (component) => {
                const armrestsLegs = model.armrests_legs_map?.[selectedArm.code]
                if (armrestsLegs && armrestsLegs.length > 0) {
                  return armrestsLegs.includes(component.code)
                }
                const legsCodes = model.legs ? extractLegCodes(model.legs) : []
                return legsCodes.includes(component.code)
              }
            )

            modified.push({
              ...legsGroup,
              code: newGroupCode,
              nameOverride,
              order: legsGroup.order + (i + 1) * 0.1,
              additional_components: filteredComponents.map((component) => ({
                ...component,
                groupCode: newGroupCode,
                groupNameOverride: nameOverride,
                moduleId: model.sofaModuleId,
              })),
            })
          })
      }
    } else {
      // All armrests share the same legs — filter by intersection of all selected armrests
      const originalLegsGroup = originalGroups.find((g) => g.code === "legs")
      if (originalLegsGroup && !modified.some((g) => g.code === "legs")) {
        // Collect compatible legs for each selected armrest
        const legsPerArmrest: string[][] = []
        for (const armrest of selectedArmrests) {
          const moduleCode = armrest.groupCode?.split("armrest-")[1]
          const model = modelWithArmrestInUse.find((m) => m.code === moduleCode)
          const armrestLegs = model?.armrests_legs_map?.[armrest.code]
          if (armrestLegs && armrestLegs.length > 0) {
            legsPerArmrest.push(armrestLegs)
          }
        }

        if (legsPerArmrest.length > 0) {
          // Intersect: only legs common to ALL selected armrests
          let commonLegs = legsPerArmrest[0]
          for (let i = 1; i < legsPerArmrest.length; i++) {
            commonLegs = commonLegs.filter((code) =>
              legsPerArmrest[i].includes(code)
            )
          }

          const filteredLegsGroup: ComponentGroup = {
            ...originalLegsGroup,
            additional_components: originalLegsGroup.additional_components.filter(
              (component) => commonLegs.includes(component.code)
            ),
          }
          modified.push(filteredLegsGroup)
        } else {
          // No armrests_legs_map — fall back to intersection of metadata.legs
          const legsFromMetadata: string[][] = []
          for (const model of modelWithArmrestInUse) {
            if (model.legs && model.legs.length > 0) {
              legsFromMetadata.push(extractLegCodes(model.legs))
            }
          }
          if (legsFromMetadata.length > 0) {
            let commonLegs = legsFromMetadata[0]
            for (let i = 1; i < legsFromMetadata.length; i++) {
              commonLegs = commonLegs.filter((code) =>
                legsFromMetadata[i].includes(code)
              )
            }
            modified.push({
              ...originalLegsGroup,
              additional_components: originalLegsGroup.additional_components.filter(
                (component) => commonLegs.includes(component.code)
              ),
            })
          } else {
            modified.push(originalLegsGroup)
          }
        }
      }
    }
  } else if (modelWithArmrestInUse.length === 1) {
    // Single armrest module — filter legs by metadata and armrest selection
    const originalLegsGroup = originalGroups.find((g) => g.code === "legs")
    if (originalLegsGroup && !modified.some((g) => g.code === "legs")) {
      const model = modelWithArmrestInUse[0]
      const selectedArm = selectedComponents.find(
        (c) => c.groupCode === "armrest-" + model.code
      )
      const armrestLegs = selectedArm ? model.armrests_legs_map?.[selectedArm.code] : undefined
      const metadataLegCodes = model.legs ? extractLegCodes(model.legs) : undefined
      const filterCodes = (armrestLegs && armrestLegs.length > 0) ? armrestLegs : metadataLegCodes

      if (filterCodes && filterCodes.length > 0) {
        modified.push({
          ...originalLegsGroup,
          additional_components: originalLegsGroup.additional_components.filter(
            (component) => filterCodes.includes(component.code)
          ),
        })
      } else {
        modified.push(originalLegsGroup)
      }
    }
  } else {
    // No armrest modules — check for additionalLegs fallback
    const originalLegsGroup = originalGroups.find((g) => g.code === "legs")

    if (originalLegsGroup) {
      // Check if any module has additionalLegs metadata
      const hasAdditionalLegs = sofaCombinations.some((sofaSet) =>
        sofaSet.some(
          (module) => module?.attrs?.originalSofaForm?.metadata?.additionalLegs
        )
      )

      if (hasAdditionalLegs && sofaForms && sofaForms.length > 0) {
        // Find the sofa form with the most legs in metadata
        const formWithMostLegs = sofaForms
          .filter((form: any) => form.metadata?.legs?.length > 0)
          .reduce((best: any, current: any) => {
            const currentCount = current.metadata?.legs?.length ?? 0
            const bestCount = best?.metadata?.legs?.length ?? 0
            return currentCount > bestCount ? current : best
          }, null)

        if (formWithMostLegs) {
          let supportedLegCodes: string[] = formWithMostLegs.metadata.legs.map(
            (leg: any) => leg.code ?? leg
          )

          // If form has armrests_legs_map, filter by first non-A000 armrest
          if (formWithMostLegs.metadata?.armrests_legs_map) {
            const firstArmrestCode = Object.keys(
              formWithMostLegs.metadata.armrests_legs_map
            ).find((code: string) => !code.includes(":A000"))

            if (firstArmrestCode) {
              const firstArmrestLegs =
                formWithMostLegs.metadata.armrests_legs_map[firstArmrestCode] ?? []
              supportedLegCodes = supportedLegCodes.filter((code: string) =>
                firstArmrestLegs.includes(code)
              )
            }
          }

          // Filter the legs group to only supported legs
          const filteredLegsGroup: ComponentGroup = {
            ...originalLegsGroup,
            additional_components: originalLegsGroup.additional_components.filter(
              (component) => supportedLegCodes.includes(component.code)
            ),
          }
          modified.push(filteredLegsGroup)
        } else {
          // No form with legs metadata — keep original
          if (!modified.some((g) => g.code === "legs")) {
            modified.push(originalLegsGroup)
          }
        }
      } else {
        // No additionalLegs flag — keep original legs group
        if (!modified.some((g) => g.code === "legs")) {
          modified.push(originalLegsGroup)
        }
      }
    }
  }

  return modified
}

/**
 * Get the default armrest width from the product's additional component groups.
 */
export function getDefaultArmrestWidth(
  additionalComponentGroups: ComponentGroup[]
): { width: number; name: string } | null {
  const armrestGroup = additionalComponentGroups.find(
    (g) => g.code === "armrest"
  )
  if (!armrestGroup || !armrestGroup.additional_components.length) return null

  // Pick the first armrest with width > 0 to avoid "covered side" (width 0) options
  const component = armrestGroup.additional_components.find(
    (c) => (c.dimensions?.armrest_width ?? 0) > 0
  ) ?? armrestGroup.additional_components[0]

  const width = component?.dimensions?.armrest_width ?? null
  if (width == null) return null

  const name = component?.additional_component_profiles?.[0]?.name ?? component?.code ?? ""
  return { width, name }
}

/**
 * Build sorted fabric groups with price multipliers from manufacturer data.
 */
export function buildSortedFabricGroups(
  manufacturerFabricPriceCategories: {
    group_number: number
    fabric_groups: any[]
  }[]
): any[] {
  const seen = new Map<number, any>()

  for (const priceCategory of manufacturerFabricPriceCategories) {
    for (const group of priceCategory.fabric_groups) {
      if (seen.has(group.id)) continue

      const groupNumber = priceCategory.group_number ?? 0
      let priceMultiplier = 1
      if (groupNumber > 2 && groupNumber < 5) priceMultiplier = 2
      else if (groupNumber > 4 && groupNumber < 7) priceMultiplier = 3
      else if (groupNumber > 6 && groupNumber < 10) priceMultiplier = 4
      else if (groupNumber > 9) priceMultiplier = 5

      seen.set(group.id, {
        priceMultiplier,
        form_price_fabric_category: priceCategory,
        ...group,
      })
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) =>
      a.form_price_fabric_category.group_number -
      b.form_price_fabric_category.group_number
  )
}

/**
 * Select the default component from each group.
 * Applies the same validity filtering as the drawer (getValidComponents) so
 * the selected default is always present in the visible component list.
 * For armrest groups, picks the first component with armrest_width > 0
 * to avoid selecting "covered side" (width 0) options.
 */
export function selectDefaultComponents(
  componentGroups: ComponentGroup[],
  existingSelections: SelectedComponent[] = [],
  sofaCombinations: any[][] = []
): SelectedComponent[] {
  const selected: SelectedComponent[] = []
  for (const group of componentGroups) {
    // Get valid components using the same filtering as the drawer
    const validComponents = getValidComponents(group, existingSelections, sofaCombinations)

    // Fall back to raw first component if all got filtered out (matches storefront behavior)
    let component = validComponents[0] ?? group.additional_components?.[0]

    // For armrest groups, prefer the first component with a positive width
    if (group.code.startsWith("armrest") && validComponents.length) {
      component =
        validComponents.find(
          (c) => (c.dimensions?.armrest_width ?? 0) > 0
        ) ?? component
    }

    if (component) {
      selected.push({
        ...component,
        groupCode: component.groupCode ?? group.code,
      })
    }
  }
  return selected
}
