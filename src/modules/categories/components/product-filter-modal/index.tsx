"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useMemo, useCallback, useEffect, Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import X from "@modules/common/icons/x"
import type { FilterFacetGroup } from "@lib/furnisystems-sdk/modules/filters/types"
import type { CategoryData } from "@lib/furnisystems-sdk"

interface ProductFilterModalProps {
  initialFacets: {
    attributeGroups: FilterFacetGroup[]
    totalCount: number
  }
  childCategories: CategoryData[]
  language: string
  labels: {
    filter: string
    clearAll: string
    showResults: string
    category: string
  }
}

export default function ProductFilterModal({
  initialFacets,
  childCategories,
  language,
  labels,
}: ProductFilterModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  // Parse current attrs from URL
  const currentAttrs = useMemo(() => {
    const raw = searchParams.get("attrs")
    if (!raw) return new Set<number>()
    return new Set(raw.split(",").map(Number).filter(Boolean))
  }, [searchParams])

  // Local state for pending selections (before applying)
  const [pendingAttrs, setPendingAttrs] = useState<Set<number>>(new Set())

  // Facets data (initially from server, can be refreshed)
  const [facets, setFacets] = useState(initialFacets)

  // Sync initial facets when they change (server re-render)
  useEffect(() => {
    setFacets(initialFacets)
  }, [initialFacets])

  const openModal = useCallback(() => {
    setPendingAttrs(new Set(currentAttrs))
    setIsOpen(true)
  }, [currentAttrs])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleAttr = useCallback((id: number) => {
    setPendingAttrs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setPendingAttrs(new Set())
  }, [])

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page") // Reset pagination on filter change

    if (pendingAttrs.size > 0) {
      params.set(
        "attrs",
        Array.from(pendingAttrs)
          .sort((a, b) => a - b)
          .join(",")
      )
    } else {
      params.delete("attrs")
    }

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setIsOpen(false)
  }, [pendingAttrs, searchParams, pathname, router])

  // Refresh facets when pending selection changes (for dynamic counts)
  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const selectedIds = Array.from(pendingAttrs)
    const categoryPermalink =
      pathname.replace(/\/$/, "").split("/categories/").pop()?.split("/").pop() || ""

    const fetchFacets = async () => {
      try {
        const params = new URLSearchParams({
          permalink: categoryPermalink,
          language,
          ...(selectedIds.length > 0 && { attrs: selectedIds.join(",") }),
        })
        const res = await fetch(`/api/filter-facets?${params}`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setFacets(data)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        // Keep existing facets on error
      }
    }

    fetchFacets()

    return () => {
      controller.abort()
    }
  }, [pendingAttrs, isOpen, language, pathname])

  const activeFilterCount = currentAttrs.size

  return (
    <>
      {/* Filter trigger button */}
      <button
        onClick={openModal}
        className="flex items-center gap-x-2 h-[56px] border border-gray-300 px-5 text-sm text-gray-700 hover:border-gray-400 transition-colors"
        data-testid="filter-button"
      >
        <FilterIcon />
        <span>{labels.filter}</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 bg-dark-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
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
                <Dialog.Panel className="flex flex-col w-full max-w-3xl transform text-left align-middle transition-all max-h-[80vh] bg-white shadow-xl border rounded-rounded">
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <Dialog.Title className="text-lg font-semibold text-dark-blue">
                      {labels.filter}
                    </Dialog.Title>
                    <button
                      onClick={closeModal}
                      data-testid="close-filter-modal"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="overflow-y-auto flex-1 p-5 space-y-6">
                    {/* Category section */}
                    {childCategories.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-dark-blue mb-3">
                          {labels.category}:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {childCategories.map((cat) => {
                            const profile = cat.category_profiles?.[0]
                            if (!profile) return null
                            const permalink =
                              profile.meta_information?.permalink
                            return (
                              <a
                                key={cat.id}
                                href={`/${language}/categories/${permalink}`}
                                className="inline-flex items-center px-4 py-2 text-sm rounded-full bg-gray-100 text-dark-blue hover:bg-gray-200 transition-colors"
                              >
                                {profile.name}
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Attribute groups */}
                    {facets.attributeGroups.map((group) => (
                      <div key={group.id}>
                        <h3 className="text-sm font-bold text-dark-blue mb-3">
                          {group.name}:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {group.attributes.map((attr) => {
                            const selected = pendingAttrs.has(attr.id)
                            const disabled = attr.count === 0 && !selected
                            return (
                              <button
                                key={attr.id}
                                onClick={() => toggleAttr(attr.id)}
                                disabled={disabled}
                                className={clx(
                                  "inline-flex items-center px-4 py-2 text-sm rounded-full transition-colors",
                                  disabled
                                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                    : selected
                                      ? "bg-dark-blue text-white"
                                      : "bg-gray-100 text-dark-blue hover:bg-gray-200"
                                )}
                              >
                                {attr.name}
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
                                  ({attr.count})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sticky footer */}
                  <div className="flex items-center justify-between p-5 border-t border-gray-200">
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <X size={14} />
                      <span>{labels.clearAll}</span>
                    </button>
                    <button
                      onClick={apply}
                      className="bg-gold text-white px-8 py-3 text-sm font-medium rounded-rounded hover:opacity-90 transition-opacity"
                      data-testid="apply-filters-button"
                    >
                      {labels.showResults} {facets.totalCount}
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
