import type { FabricFeatureDetail } from "@lib/furnisystems-sdk/modules/customer/types"

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
