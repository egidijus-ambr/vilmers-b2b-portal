"use client"

import { Fragment, useMemo } from "react"
import { Dialog, Transition } from "@headlessui/react"
import X from "@modules/common/icons/x"
import type {
  FabricGroupDetail,
  FabricFeatureDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"

interface FabricImageModalProps {
  isOpen: boolean
  onClose: () => void
  fabricName: string
  imageSrc: string
  groupData: FabricGroupDetail
  languageCode: string
}

function resolveProfile<T extends { language: string }>(
  profiles: T[] | undefined | null,
  languageCode: string
): T | undefined {
  if (!profiles || profiles.length === 0) return undefined
  return (
    profiles.find((p) => p.language === languageCode) ?? profiles[0]
  )
}

function resolveFeatureName(
  feature: FabricFeatureDetail,
  languageCode: string
): string {
  const profile = resolveProfile(feature.fabric_feature_profiles, languageCode)
  if (profile) return profile.name
  return feature.code ?? String(feature.id)
}

function resolveFeatureGroupName(
  group: NonNullable<FabricFeatureDetail["fabric_feature_group"]>,
  languageCode: string
): string {
  const profile = resolveProfile(
    group.fabric_feature_group_profiles,
    languageCode
  )
  if (profile) return profile.name
  return group.code ?? String(group.id)
}

export default function FabricImageModal({
  isOpen,
  onClose,
  fabricName,
  imageSrc,
  groupData,
  languageCode,
}: FabricImageModalProps) {
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

  const resolvedGroupName = useMemo(() => {
    const profile = resolveProfile(groupData.fabric_group_profiles, languageCode)
    return (profile as any)?.name ?? null
  }, [groupData, languageCode])

  const { featuresWithPhoto, withoutPhoto } = useMemo(() => {
    const features = groupData.fabric_features ?? []
    const featuresWithPhoto: FabricFeatureDetail[] = []
    const withoutPhoto: FabricFeatureDetail[] = []

    features.forEach(({ fabric_feature }) => {
      const photo = (fabric_feature as any)?.photo
      if (photo) {
        featuresWithPhoto.push(fabric_feature)
      } else {
        withoutPhoto.push(fabric_feature)
      }
    })

    return { featuresWithPhoto, withoutPhoto }
  }, [groupData.fabric_features])

  const featureGroups = useMemo(() => {
    type GroupEntry = {
      groupId: number | null
      groupName: string
      features: FabricFeatureDetail[]
    }
    const groupMap = new Map<number | null, GroupEntry>()

    withoutPhoto.forEach((feature) => {
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
    // Named groups first, "Other" last
    groups.sort((a, b) => {
      if (a.groupId === null) return 1
      if (b.groupId === null) return -1
      return a.groupName.localeCompare(b.groupName)
    })

    return groups
  }, [withoutPhoto, languageCode])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-opacity-75 backdrop-blur-md h-screen" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-hidden">
          <div className="flex min-h-full h-full justify-center p-0 md:p-4 text-center items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex flex-col w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] transform text-left align-middle transition-all bg-gold-10 md:shadow-xl md:border md:rounded-rounded">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200 flex-shrink-0">
                  <Dialog.Title className="text-lg md:text-xl text-dark-blue font-medium truncate">
                    {fabricName}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-dark-blue hover:opacity-70 transition-opacity ml-4 flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content: Image + Details */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                  {/* Image */}
                  <div className="flex-1 min-h-[40vh] md:min-h-0 flex items-center justify-center overflow-hidden bg-gold-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={fabricName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details Panel */}
                  <div className="w-full md:w-80 lg:w-96 flex-shrink-0 md:overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 p-6">
                    {/* Group Name */}
                    {resolvedGroupName && (
                      <h3 className="text-xl font-semibold text-dark-blue">
                        {resolvedGroupName}
                      </h3>
                    )}
                    {/* Price Category */}
                    {priceCategory && (
                      <p className="text-sm text-dark-blue/70 mt-1">
                        {priceCategory}
                      </p>
                    )}

                    {/* Feature Grid */}
                    {featureGroups.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-5 mt-6">
                        {featureGroups.map((group) =>
                          group.features.map((feature) => (
                            <div key={feature.id} className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-dark-blue tracking-wide uppercase">
                                {group.groupName}
                              </span>
                              <span className="text-sm text-dark-blue">
                                {resolveFeatureName(feature, languageCode)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Characteristics with photos */}
                    {featuresWithPhoto.length > 0 && (
                      <div className="flex flex-wrap gap-4 mt-6">
                        {featuresWithPhoto.map((feature) => {
                          const photo = (feature as any)?.photo
                          const name = resolveFeatureName(feature, languageCode)
                          return (
                            <div
                              key={feature.id}
                              className="flex flex-col items-center gap-1"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo?.src ?? photo}
                                alt={name}
                                className="w-10 h-10 object-contain"
                              />
                              <span className="text-xs text-dark-blue text-center">
                                {name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
