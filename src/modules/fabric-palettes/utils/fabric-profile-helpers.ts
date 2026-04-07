import type { FabricFeatureDetail } from "@lib/furnisystems-sdk/modules/customer/types"

export function resolveProfile<T extends { language: string }>(
  profiles: T[] | undefined | null,
  languageCode: string
): T | undefined {
  if (!profiles || profiles.length === 0) return undefined
  return profiles.find((p) => p.language === languageCode) ?? profiles[0]
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
