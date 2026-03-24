import type { FabricPaletteDetail } from "@lib/furnisystems-sdk/modules/customer/types"

/**
 * Groups selected feature IDs by their fabric_feature_group.id.
 * Returns Map<groupId | null, featureIds[]> for OR-within-group, AND-across-groups logic.
 */
export function groupSelectedFeatures(
  selectedFeatures: Set<number>,
  featureToGroupMap: Map<number, number | null>
): Map<number | null, number[]> {
  const grouped = new Map<number | null, number[]>()
  selectedFeatures.forEach((fId) => {
    const groupId = featureToGroupMap.get(fId) ?? null
    if (!grouped.has(groupId)) {
      grouped.set(groupId, [])
    }
    grouped.get(groupId)!.push(fId)
  })
  return grouped
}

/**
 * Checks whether a fabric group matches the selected features using
 * OR-within-group, AND-across-groups logic.
 *
 * For each feature group with selections, the fabric group must have
 * AT LEAST ONE of the selected features (OR). All groups must be satisfied (AND).
 */
export function matchesFeatureSelection(
  fabricGroupFeatureIds: Set<number>,
  groupedSelection: Map<number | null, number[]>
): boolean {
  for (const [, featureIdsInGroup] of groupedSelection) {
    if (!featureIdsInGroup.some((fId) => fabricGroupFeatureIds.has(fId))) {
      return false
    }
  }
  return true
}

/**
 * Builds a featureId → featureGroupId mapping from palette data.
 */
export function buildFeatureToGroupMap(
  palettes: FabricPaletteDetail[]
): Map<number, number | null> {
  const map = new Map<number, number | null>()
  palettes.forEach((palette) => {
    palette.fabric_groups.forEach((entry) => {
      ;(entry.fabric_group.fabric_features ?? []).forEach((fgf) => {
        if (!map.has(fgf.fabric_feature.id)) {
          map.set(
            fgf.fabric_feature.id,
            fgf.fabric_feature.fabric_feature_group?.id ?? null
          )
        }
      })
    })
  })
  return map
}
