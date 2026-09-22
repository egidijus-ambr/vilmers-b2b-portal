import type {
  FabricFeatureDetail,
  FabricGroupDetail,
  FabricGroupToPaletteEntry,
  FabricPaletteDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"

export function resolveProfile<T extends { language: string }>(
  profiles: T[] | undefined | null,
  languageCode: string
): T | undefined {
  if (!profiles || profiles.length === 0) return undefined
  return profiles.find((p) => p.language === languageCode) ?? profiles[0]
}

/**
 * Sibling of `resolveProfile` for callers that want a plain string rather
 * than the profile row itself. Differs from `resolveProfile` in two ways:
 * the language match is case-insensitive, and when that match's own value is
 * empty/whitespace it falls back to the first profile with a non-empty value
 * (rather than always `profiles[0]`). `getValue` may return `null`/`undefined`
 * (some profile fields aren't guaranteed non-null at runtime even where the
 * type says `string`) — those are treated as empty, never thrown on.
 */
export function resolveProfileValue<T extends { language: string }>(
  profiles: T[] | undefined | null,
  languageCode: string,
  getValue: (profile: T) => string | null | undefined
): string {
  if (!profiles || profiles.length === 0) return ""
  const lang = languageCode.toLowerCase()
  const match = profiles.find((p) => p.language.toLowerCase() === lang)
  const matchValue = (match ? getValue(match) : undefined) ?? ""
  if (matchValue.trim()) return matchValue
  const fallback = profiles.find((p) => (getValue(p) ?? "").trim())
  return fallback ? getValue(fallback) ?? "" : matchValue
}

/**
 * Default (manufacturer) name for a fabric group, ignoring any palette-level
 * name override. `resolveProfileValue` already skips a blank profile name
 * and matches language case-insensitively, so the only fallback left to
 * handle here is the synthetic label when the group has no usable profile
 * name at all — using the group's own id as a last resort.
 */
export function resolveGroupDefaultName(
  group: FabricGroupDetail,
  languageCode: string
): string {
  const name = resolveProfileValue(
    group.fabric_group_profiles,
    languageCode,
    (p) => p.name
  )
  return name || `Group ${group.id}`
}

/**
 * One row per fabric group, merged across every palette the customer can
 * see it through. A customer can hold several palettes at once (direct
 * membership plus one via their customer group), and the same fabric group
 * commonly sits in more than one of them — `Fabric`/`FabricGroup` data
 * (fabrics, features, price categories, profiles) lives on `FabricGroup`
 * itself, not on the palette join row, so nothing is lost by collapsing
 * duplicate memberships into a single row keyed by `fabric_group.id`.
 *
 * `entries` only partially preserves a priority order. `palettes` is
 * returned direct-palettes-first then group-palettes, deduped by palette id
 * (see `getFabricPalettes` and its acting-customer sibling
 * `getFabricPalettesForCustomer` — both order the same way), so a direct
 * membership in this array does outrank a group membership. But *within*
 * `directPalettes` (and within `groupPalettes`) the order is whatever the
 * GraphQL relation returns — there is no priority field in the schema — so
 * if two direct palettes both override the same group, which one is
 * `entries[0]` is arbitrary and can change between requests.
 */
// `fabric_group_id` (not `id`) is deliberate: `FabricGroupToPaletteEntry`
// (the raw palette join row) also has a required `id` plus `fabric_group`
// and an optional `name`, which made a merged row structurally assignable
// to a join row — passing one where the other was expected compiled fine
// and silently read `.name` as `undefined`. Naming the scalar differently
// closes that hole in both directions.
export interface MergedFabricGroupEntry {
  fabric_group_id: number
  fabric_group: FabricGroupDetail
  entries: FabricGroupToPaletteEntry[]
}

export function mergeFabricGroupsAcrossPalettes(
  palettes: FabricPaletteDetail[]
): MergedFabricGroupEntry[] {
  const merged: MergedFabricGroupEntry[] = []
  const byGroupId = new Map<number, MergedFabricGroupEntry>()

  for (const palette of palettes) {
    for (const entry of palette.fabric_groups) {
      const groupId = entry.fabric_group.id
      const existing = byGroupId.get(groupId)
      if (existing) {
        existing.entries.push(entry)
        continue
      }
      const row: MergedFabricGroupEntry = {
        fabric_group_id: groupId,
        fabric_group: entry.fabric_group,
        entries: [entry],
      }
      byGroupId.set(groupId, row)
      merged.push(row)
    }
  }

  return merged
}

/**
 * Display name for a merged fabric group: the first entry (in `entries`
 * order — see the caveat on `MergedFabricGroupEntry` above, direct-before-
 * group is guaranteed but ties within that aren't) carrying a non-empty
 * (post-trim) name override wins, falling back to the manufacturer default
 * when none do. Mirrors `getGroupName` in the configurator's
 * `palette-utils.ts`.
 */
export function resolveMergedGroupDisplayName(
  merged: MergedFabricGroupEntry,
  languageCode: string
): string {
  const withOverride = merged.entries.find((entry) => entry.name?.trim())
  if (withOverride) return withOverride.name!.trim()
  return resolveGroupDefaultName(merged.fabric_group, languageCode)
}

/**
 * Every distinct name this group is known by across the customer's
 * palettes — every palette's own override (if any) plus the manufacturer
 * default — so search matches whichever spelling the customer remembers,
 * not just the one currently displayed as the winning override.
 */
export function resolveMergedGroupSearchNames(
  merged: MergedFabricGroupEntry,
  languageCode: string
): string[] {
  const names = new Set<string>()
  for (const entry of merged.entries) {
    if (entry.name?.trim()) names.add(entry.name.trim())
  }
  names.add(resolveGroupDefaultName(merged.fabric_group, languageCode))
  return Array.from(names)
}

export function resolveFeatureName(
  feature: FabricFeatureDetail,
  languageCode: string
): string {
  const profile = resolveProfile(feature.fabric_feature_profiles, languageCode)
  if (profile) return profile.name
  return feature.code ?? String(feature.id)
}

export function resolveFeatureGroupName(
  group: NonNullable<FabricFeatureDetail["fabric_feature_group"]>,
  languageCode: string
): string {
  const profile = resolveProfile(group.fabric_feature_group_profiles, languageCode)
  if (profile) return profile.name
  return group.code ?? String(group.id)
}
