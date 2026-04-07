"use client"

import { useMemo } from "react"
import type {
  FabricGroupDetail,
  FabricFeatureDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"
import { resolveProfile, resolveFeatureGroupName } from "../utils/fabric-profile-helpers"

export interface FeatureGroupEntry {
  groupId: number | null
  groupName: string
  features: FabricFeatureDetail[]
}

export function useFabricGroupDetails(
  groupData: FabricGroupDetail,
  languageCode: string
) {
  const priceCategory = useMemo(() => {
    const categories = (groupData as any)?.fabric_price_category
    if (Array.isArray(categories) && categories.length > 0) {
      const first = categories[0]
      const groupNumber =
        first?.group_number ?? first?.number ?? first?.name ?? null
      if (groupNumber !== null && groupNumber !== undefined) {
        return `CAT ${groupNumber}`
      }
    }
    return null
  }, [groupData])

  const description = useMemo(() => {
    const profile = resolveProfile(groupData.fabric_group_profiles, languageCode)
    return (profile as any)?.description ?? null
  }, [groupData, languageCode])

  const { featuresWithPhoto, featuresWithoutPhoto } = useMemo(() => {
    const features = groupData.fabric_features ?? []
    const featuresWithPhoto: FabricFeatureDetail[] = []
    const featuresWithoutPhoto: FabricFeatureDetail[] = []

    features.forEach(({ fabric_feature }) => {
      const photo = (fabric_feature as any)?.photo
      if (photo) {
        featuresWithPhoto.push(fabric_feature)
      } else {
        featuresWithoutPhoto.push(fabric_feature)
      }
    })

    return { featuresWithPhoto, featuresWithoutPhoto }
  }, [groupData.fabric_features])

  const featureGroups = useMemo(() => {
    const groupMap = new Map<number | null, FeatureGroupEntry>()

    featuresWithoutPhoto.forEach((feature) => {
      const fgroup = feature.fabric_feature_group ?? null
      const groupId = fgroup ? fgroup.id : null
      const gName = fgroup
        ? resolveFeatureGroupName(fgroup, languageCode)
        : "Other"

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { groupId, groupName: gName, features: [] })
      }
      groupMap.get(groupId)!.features.push(feature)
    })

    const groups = Array.from(groupMap.values())
    groups.sort((a, b) => {
      if (a.groupId === null) return 1
      if (b.groupId === null) return -1
      return a.groupName.localeCompare(b.groupName)
    })

    return groups
  }, [featuresWithoutPhoto, languageCode])

  return { priceCategory, description, featuresWithPhoto, featuresWithoutPhoto, featureGroups }
}
