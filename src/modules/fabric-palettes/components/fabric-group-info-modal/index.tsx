"use client"

import { Fragment, useMemo } from "react"
import { Dialog, Transition } from "@headlessui/react"
import X from "@modules/common/icons/x"
import type {
  FabricGroupDetail,
  FabricFeatureDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"

interface FabricGroupInfoModalProps {
  isOpen: boolean
  onClose: () => void
  groupName: string
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

export default function FabricGroupInfoModal({
  isOpen,
  onClose,
  groupName,
  groupData,
  languageCode,
}: FabricGroupInfoModalProps) {
  // Resolve price category label — use optional chaining for fields not yet in types
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

  // Resolve description from group profile — optional field
  const description = useMemo(() => {
    const profile = resolveProfile(groupData.fabric_group_profiles, languageCode)
    return (profile as any)?.description ?? null
  }, [groupData, languageCode])

  // Split features into those with a photo (characteristics icons) and those without
  const { withPhoto, withoutPhoto } = useMemo(() => {
    const features = groupData.fabric_features ?? []
    const withPhoto: FabricFeatureDetail[] = []
    const withoutPhoto: FabricFeatureDetail[] = []

    features.forEach(({ fabric_feature }) => {
      const photo = (fabric_feature as any)?.photo
      if (photo) {
        withPhoto.push(fabric_feature)
      } else {
        withoutPhoto.push(fabric_feature)
      }
    })

    return { withPhoto, withoutPhoto }
  }, [groupData.fabric_features])

  // Group the text-only features by their fabric_feature_group for grid display
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
          <div className="flex min-h-full h-full justify-center p-4 text-center items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="flex flex-col w-full max-w-2xl transform text-left align-middle transition-all max-h-[80vh] bg-gold-10 shadow-xl border rounded-rounded">
                {/* Header */}
                <div className="flex items-start justify-between px-8 py-6 border-b border-gray-200">
                  <div>
                    <Dialog.Title className="text-2xl text-dark-blue font-medium">
                      {groupName}
                    </Dialog.Title>
                    {priceCategory && (
                      <p className="mt-1 text-sm text-gold tracking-wider uppercase">
                        {priceCategory}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    data-testid="close-fabric-group-info-modal"
                    className="text-dark-blue hover:opacity-70 transition-opacity ml-4 mt-1 flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-8 py-6 bg-gold-10 space-y-6">
                  {/* Optional description */}
                  {description && (
                    <p className="text-sm text-dark-blue-70 leading-relaxed">
                      {description}
                    </p>
                  )}

                  {/* Text feature grid — grouped by feature group */}
                  {featureGroups.length > 0 && (
                    <div className="grid grid-cols-2 xsmall:grid-cols-3 gap-x-8 gap-y-5">
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

                  {/* Characteristics — features with a photo icon */}
                  {withPhoto.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-dark-blue tracking-[0.2em] uppercase mb-4">
                        Characteristics
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        {withPhoto.map((feature) => {
                          const photo = (feature as any)?.photo
                          const name = resolveFeatureName(feature, languageCode)
                          return (
                            <div
                              key={feature.id}
                              className="flex flex-col items-center gap-1.5"
                              title={name}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo?.src ?? photo}
                                alt={name}
                                className="w-10 h-10 object-contain"
                              />
                              <span className="text-xs text-dark-blue-70 text-center max-w-[60px] leading-tight">
                                {name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {featureGroups.length === 0 && withPhoto.length === 0 && (
                    <p className="text-sm text-dark-blue-70 italic">
                      No feature information available.
                    </p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
