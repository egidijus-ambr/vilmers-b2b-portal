"use client"

import { useState, useMemo, useCallback, Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import X from "@modules/common/icons/x"
import Button from "@modules/common/components/button"
import type {
  FabricPaletteDetail,
  FabricFeatureDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"
import { groupSelectedFeatures, matchesFeatureSelection } from "../../utils/feature-filter-logic"
import { resolveFeatureName, resolveFeatureGroupName } from "../../utils/fabric-profile-helpers"

interface FabricFeatureFilterModalProps {
  palettes: FabricPaletteDetail[]
  selectedFeatures: Set<number>
  selectedPriceCategories: Set<number>
  onApply: (selectedFeatureIds: Set<number>, selectedPriceCategories: Set<number>) => void
  language: string
  labels: { filter: string; clearAll: string; showResults: string; priceCategory: string }
}

export default function FabricFeatureFilterModal({
  palettes,
  selectedFeatures,
  selectedPriceCategories,
  onApply,
  language,
  labels,
}: FabricFeatureFilterModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingFeatures, setPendingFeatures] = useState<Set<number>>(new Set())
  const [pendingPriceCategories, setPendingPriceCategories] = useState<Set<number>>(new Set())

  const openModal = useCallback(() => {
    setPendingFeatures(new Set(selectedFeatures))
    setPendingPriceCategories(new Set(selectedPriceCategories))
    setIsOpen(true)
  }, [selectedFeatures, selectedPriceCategories])

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

  const togglePriceCategory = useCallback((groupNumber: number) => {
    setPendingPriceCategories((prev) => {
      const next = new Set(prev)
      if (next.has(groupNumber)) {
        next.delete(groupNumber)
      } else {
        next.add(groupNumber)
      }
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setPendingFeatures(new Set())
    setPendingPriceCategories(new Set())
  }, [])

  const apply = useCallback(() => {
    onApply(pendingFeatures, pendingPriceCategories)
    setIsOpen(false)
  }, [pendingFeatures, pendingPriceCategories, onApply])

  // Collect all unique fabric groups across all palettes (dedup by fabric_group.id)
  const allFabricGroups = useMemo(() => {
    const seen = new Map<number, { featureIds: Set<number>; priceCategoryGroupNumbers: Set<number> }>()
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
          const priceCategoryGroupNumbers = new Set<number>()
          if (group.fabric_price_category) {
            group.fabric_price_category.forEach((pc) => {
              priceCategoryGroupNumbers.add(pc.group_number)
            })
          }
          seen.set(group.id, { featureIds, priceCategoryGroupNumbers })
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

  const featureToGroupMap = useMemo(() => {
    const map = new Map<number, number | null>()
    featureMetaMap.forEach((feature, featureId) => {
      map.set(featureId, feature.fabric_feature_group?.id ?? null)
    })
    return map
  }, [featureMetaMap])

  // Compute price category options with counts
  const priceCategoryOptions = useMemo(() => {
    const allGroupNumbers = new Set<number>()
    allFabricGroups.forEach(({ priceCategoryGroupNumbers }) => {
      priceCategoryGroupNumbers.forEach((gn) => allGroupNumbers.add(gn))
    })

    const grouped = groupSelectedFeatures(pendingFeatures, featureToGroupMap)

    const options = Array.from(allGroupNumbers).map((groupNumber) => {
      let count = 0
      allFabricGroups.forEach(({ featureIds, priceCategoryGroupNumbers }) => {
        const matchesFeatures =
          pendingFeatures.size === 0 || matchesFeatureSelection(featureIds, grouped)
        if (matchesFeatures && priceCategoryGroupNumbers.has(groupNumber)) {
          count++
        }
      })
      return { groupNumber, count }
    })

    options.sort((a, b) => a.groupNumber - b.groupNumber)
    return options
  }, [allFabricGroups, pendingFeatures, featureToGroupMap])

  // Compute feature groups with counts (depends on pendingFeatures for OR-within-group, AND-across-groups counts)
  const featureGroups = useMemo(() => {
    const computeCount = (featureId: number): number => {
      const candidateGroupId = featureToGroupMap.get(featureId) ?? null

      // Build cross-group selections (exclude candidate's group)
      const crossGroupSelections = new Map<number | null, number[]>()
      pendingFeatures.forEach((fId) => {
        const gId = featureToGroupMap.get(fId) ?? null
        if (gId !== candidateGroupId) {
          if (!crossGroupSelections.has(gId)) crossGroupSelections.set(gId, [])
          crossGroupSelections.get(gId)!.push(fId)
        }
      })

      const pendingPriceCatsArr = Array.from(pendingPriceCategories)
      let count = 0
      allFabricGroups.forEach(({ featureIds, priceCategoryGroupNumbers }) => {
        if (!featureIds.has(featureId)) return
        if (crossGroupSelections.size > 0 && !matchesFeatureSelection(featureIds, crossGroupSelections)) return
        const matchesPriceCats =
          pendingPriceCatsArr.length === 0 ||
          pendingPriceCatsArr.some((pc) => priceCategoryGroupNumbers.has(pc))
        if (matchesPriceCats) count++
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
  }, [allFabricGroups, featureMetaMap, pendingFeatures, pendingPriceCategories, featureToGroupMap, language])

  const totalCount = useMemo(() => {
    const pendingPriceCatsArray = Array.from(pendingPriceCategories)
    const grouped = groupSelectedFeatures(pendingFeatures, featureToGroupMap)
    let count = 0
    allFabricGroups.forEach(({ featureIds, priceCategoryGroupNumbers }) => {
      const matchesFeatures =
        pendingFeatures.size === 0 || matchesFeatureSelection(featureIds, grouped)
      const matchesPriceCats =
        pendingPriceCatsArray.length === 0 ||
        pendingPriceCatsArray.some((pc) => priceCategoryGroupNumbers.has(pc))
      if (matchesFeatures && matchesPriceCats) count++
    })
    return count
  }, [allFabricGroups, pendingFeatures, pendingPriceCategories, featureToGroupMap])

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
        {(selectedFeatures.size + selectedPriceCategories.size) > 0 && (
          <span className="ml-1 bg-dark-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {selectedFeatures.size + selectedPriceCategories.size}
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
                    {priceCategoryOptions.length > 0 && (
                      <div className="border-b border-gray-200 py-5">
                        <h3 className="text-xs text-dark-blue tracking-[0.2em] uppercase mb-4">
                          {labels.priceCategory}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {priceCategoryOptions.map(({ groupNumber, count }) => {
                            const selected = pendingPriceCategories.has(groupNumber)
                            const disabled = count === 0 && !selected
                            return (
                              <button
                                key={groupNumber}
                                onClick={() => togglePriceCategory(groupNumber)}
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
                                CAT {groupNumber}
                                <span className={clx("ml-1.5", disabled ? "text-gray-300" : selected ? "text-gray-300" : "text-gray-400")}>
                                  ({count})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
                    <Button
                      className="w-full"
                      onClick={apply}
                      data-testid="apply-fabric-feature-filters-button"
                    >
                      {labels.showResults} ({totalCount})
                    </Button>
                    <Button variant="outline" className="w-full" onClick={clearAll}>
                      {labels.clearAll}
                    </Button>
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
