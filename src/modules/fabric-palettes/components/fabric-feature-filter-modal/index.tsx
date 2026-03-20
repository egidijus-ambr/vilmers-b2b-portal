"use client"

import { useState, useMemo, useCallback, Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import X from "@modules/common/icons/x"
import type {
  FabricPaletteDetail,
  FabricFeatureDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"

interface FabricFeatureFilterModalProps {
  palettes: FabricPaletteDetail[]
  selectedFeatures: Set<number>
  onApply: (selectedFeatureIds: Set<number>) => void
  language: string
  labels: { filter: string; clearAll: string; showResults: string }
}

function resolveFeatureName(
  feature: FabricFeatureDetail,
  language: string
): string {
  if (feature.fabric_feature_profiles && feature.fabric_feature_profiles.length > 0) {
    const match = feature.fabric_feature_profiles.find(
      (p) => p.language === language
    )
    const profile = match ?? feature.fabric_feature_profiles[0]
    return profile.name
  }
  return feature.code ?? String(feature.id)
}

function resolveFeatureGroupName(
  group: NonNullable<FabricFeatureDetail["fabric_feature_group"]>,
  language: string
): string {
  if (
    group.fabric_feature_group_profiles &&
    group.fabric_feature_group_profiles.length > 0
  ) {
    const match = group.fabric_feature_group_profiles.find(
      (p) => p.language === language
    )
    const profile = match ?? group.fabric_feature_group_profiles[0]
    return profile.name
  }
  return group.code ?? String(group.id)
}

export default function FabricFeatureFilterModal({
  palettes,
  selectedFeatures,
  onApply,
  language,
  labels,
}: FabricFeatureFilterModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingFeatures, setPendingFeatures] = useState<Set<number>>(new Set())

  const openModal = useCallback(() => {
    setPendingFeatures(new Set(selectedFeatures))
    setIsOpen(true)
  }, [selectedFeatures])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleFeature = useCallback((id: number) => {
    setPendingFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setPendingFeatures(new Set())
  }, [])

  const apply = useCallback(() => {
    onApply(pendingFeatures)
    setIsOpen(false)
  }, [pendingFeatures, onApply])

  // Collect all unique fabric groups across all palettes (dedup by fabric_group.id)
  const allFabricGroups = useMemo(() => {
    const seen = new Map<number, { featureIds: Set<number> }>()
    palettes.forEach((palette) => {
      palette.fabric_groups.forEach((entry) => {
        const group = entry.fabric_group
        if (!seen.has(group.id)) {
          const featureIds = new Set<number>()
          if (group.fabric_features) {
            group.fabric_features.forEach((fgf) => {
              featureIds.add(fgf.fabric_feature.id)
            })
          }
          seen.set(group.id, { featureIds })
        }
      })
    })
    return seen
  }, [palettes])

  // Build a map of featureId -> FabricFeatureDetail for metadata
  const featureMetaMap = useMemo(() => {
    const map = new Map<number, FabricFeatureDetail>()
    palettes.forEach((palette) => {
      palette.fabric_groups.forEach((entry) => {
        const group = entry.fabric_group
        if (group.fabric_features) {
          group.fabric_features.forEach((fgf) => {
            if (!map.has(fgf.fabric_feature.id)) {
              map.set(fgf.fabric_feature.id, fgf.fabric_feature)
            }
          })
        }
      })
    })
    return map
  }, [palettes])

  // Compute feature groups with counts (depends on pendingFeatures for AND-logic counts)
  const featureGroups = useMemo(() => {
    // For each feature, count = number of fabric groups that have ALL pendingFeatures AND this feature
    const pendingArray = Array.from(pendingFeatures)
    const computeCount = (featureId: number): number => {
      let count = 0
      allFabricGroups.forEach(({ featureIds }) => {
        // Must have all currently pending features
        const hasAll = pendingArray.every((pid) => featureIds.has(pid))
        // AND must also have this feature
        if (hasAll && featureIds.has(featureId)) {
          count++
        }
      })
      return count
    }

    // Group features by their fabric_feature_group
    // ungroupedKey = null means "Other"
    type GroupEntry = {
      groupId: number | null
      groupName: string
      features: { feature: FabricFeatureDetail; count: number }[]
    }

    const groupMap = new Map<number | null, GroupEntry>()

    featureMetaMap.forEach((feature, featureId) => {
      const count = computeCount(featureId)
      const fgroup = feature.fabric_feature_group ?? null
      const groupId = fgroup ? fgroup.id : null
      const groupName = fgroup ? resolveFeatureGroupName(fgroup, language) : "Other"

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { groupId, groupName, features: [] })
      }
      groupMap.get(groupId)!.features.push({ feature, count })
    })

    // Sort features within each group by name
    const groups = Array.from(groupMap.values())
    for (const g of groups) {
      g.features.sort((a, b) =>
        resolveFeatureName(a.feature, language).localeCompare(
          resolveFeatureName(b.feature, language)
        )
      )
    }

    // Sort groups: named groups alphabetically, "Other" last
    groups.sort((a, b) => {
      if (a.groupId === null) return 1
      if (b.groupId === null) return -1
      return a.groupName.localeCompare(b.groupName)
    })

    return groups
  }, [allFabricGroups, featureMetaMap, pendingFeatures, language])

  // Total count: fabric groups matching ALL pendingFeatures
  const totalCount = useMemo(() => {
    const pendingArray = Array.from(pendingFeatures)
    let count = 0
    allFabricGroups.forEach(({ featureIds }) => {
      const hasAll = pendingArray.every((pid) => featureIds.has(pid))
      if (hasAll) count++
    })
    return count
  }, [allFabricGroups, pendingFeatures])

  return (
    <>
      {/* Filter trigger button */}
      <button
        onClick={openModal}
        className="flex items-center gap-x-2 h-[56px] border border-gray-300 px-5 text-sm text-gray-700 hover:border-gray-400 transition-colors"
        data-testid="fabric-feature-filter-button"
      >
        <FilterIcon />
        <span>{labels.filter}</span>
        {selectedFeatures.size > 0 && (
          <span className="ml-1 bg-dark-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {selectedFeatures.size}
          </span>
        )}
      </button>

      {/* Filter modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={closeModal}>
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
                <Dialog.Panel className="flex flex-col w-full max-w-3xl transform text-left align-middle transition-all max-h-[80vh] bg-gold-10 shadow-xl border rounded-rounded">
                  {/* Header */}
                  <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                    <Dialog.Title className="text-2xl text-dark-blue">
                      {labels.filter}
                    </Dialog.Title>
                    <button
                      onClick={closeModal}
                      data-testid="close-fabric-feature-filter-modal"
                      className="text-dark-blue hover:opacity-70 transition-opacity"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="overflow-y-auto flex-1 px-8 py-2 bg-gold-10">
                    {featureGroups.map((group) => (
                      <div
                        key={group.groupId ?? "other"}
                        className="border-b border-gray-200 py-5 last:border-b-0"
                      >
                        <h3 className="text-xs text-dark-blue tracking-[0.2em] uppercase mb-4">
                          {group.groupName}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {group.features.map(({ feature, count }) => {
                            const selected = pendingFeatures.has(feature.id)
                            const disabled = count === 0 && !selected
                            return (
                              <button
                                key={feature.id}
                                onClick={() => toggleFeature(feature.id)}
                                disabled={disabled}
                                className={clx(
                                  "inline-flex items-center px-4 py-2 text-sm rounded-full transition-colors",
                                  disabled
                                    ? "bg-gold-10 text-gray-300 cursor-not-allowed border border-gray-200"
                                    : selected
                                    ? "bg-dark-blue text-white"
                                    : "bg-gold-20 text-dark-blue hover:bg-gold-200 border hover:border-gray-400"
                                )}
                              >
                                {resolveFeatureName(feature, language)}
                                <span
                                  className={clx(
                                    "ml-1.5",
                                    disabled
                                      ? "text-gray-300"
                                      : selected
                                      ? "text-gray-300"
                                      : "text-gray-400"
                                  )}
                                >
                                  ({count})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sticky footer */}
                  <div className="flex flex-col gap-3 px-8 py-6 border-t border-gray-200 bg-gold-10">
                    <button
                      onClick={apply}
                      className="w-full bg-dark-blue text-white py-4 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                      data-testid="apply-fabric-feature-filters-button"
                    >
                      {labels.showResults} ({totalCount})
                    </button>
                    <button
                      onClick={clearAll}
                      className="w-full border border-dark-blue text-dark-blue py-3 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors"
                    >
                      {labels.clearAll}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M1 3h14M3 8h10M5 13h6" strokeLinecap="round" />
    </svg>
  )
}
