"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useMemo, useCallback, useEffect, Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import X from "@modules/common/icons/x"
import Button from "@modules/common/components/button"
import type { FilterFacetGroup, FilterFacetCategory } from "@lib/furnisystems-sdk/modules/filters/types"

interface ProductFilterModalProps {
  initialFacets: {
    attributeGroups: FilterFacetGroup[]
    childCategories: FilterFacetCategory[]
    totalCount: number
  }
  language: string
  labels: {
    filter: string
    clearAll: string
    showResults: string
    category: string
  }
  currentCategoryId?: number
}

export default function ProductFilterModal({
  initialFacets,
  language,
  labels,
  currentCategoryId,
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

  // Parse current cats from URL
  const currentCats = useMemo(() => {
    const raw = searchParams.get("cats")
    if (!raw) return new Set<number>()
    return new Set(raw.split(",").map(Number).filter(Boolean))
  }, [searchParams])

  // Local state for pending selections (before applying)
  const [pendingAttrs, setPendingAttrs] = useState<Set<number>>(new Set())
  const [pendingCats, setPendingCats] = useState<Set<number>>(new Set())

  // Facets data (initially from server, can be refreshed)
  const [facets, setFacets] = useState(initialFacets)

  // Sync initial facets when they change (server re-render)
  useEffect(() => {
    setFacets(initialFacets)
  }, [initialFacets])

  const openModal = useCallback(() => {
    setPendingAttrs(new Set(currentAttrs))
    const initialCats = new Set(currentCats)
    if (currentCategoryId && currentCats.size === 0) {
      initialCats.add(currentCategoryId)
    }
    setPendingCats(initialCats)
    setIsOpen(true)
  }, [currentAttrs, currentCats, currentCategoryId])

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

  const toggleCat = useCallback((id: number) => {
    setPendingCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setPendingAttrs(new Set())
    setPendingCats(new Set())
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

    if (pendingCats.size > 0) {
      params.set(
        "cats",
        Array.from(pendingCats)
          .sort((a, b) => a - b)
          .join(",")
      )
    } else {
      params.delete("cats")
    }

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setIsOpen(false)
  }, [pendingAttrs, pendingCats, searchParams, pathname, router])

  // Refresh facets when pending selection changes (for dynamic counts)
  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const selectedAttrIds = Array.from(pendingAttrs)
    const selectedCatIds = Array.from(pendingCats)
    const categoryPermalink =
      pathname
        .replace(/\/$/, "")
        .split("/categories/")
        .pop()
        ?.split("/")
        .pop() || ""

    const fetchFacets = async () => {
      try {
        const params = new URLSearchParams({
          permalink: categoryPermalink,
          language,
          ...(selectedAttrIds.length > 0 && { attrs: selectedAttrIds.join(",") }),
          ...(selectedCatIds.length > 0 && { cats: selectedCatIds.join(",") }),
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
  }, [pendingAttrs, pendingCats, isOpen, language, pathname])

  // Exclude auto-seeded currentCategoryId from the count — it's page context, not a user filter
  const userSelectedCatCount = currentCategoryId && currentCats.has(currentCategoryId)
    ? currentCats.size - 1
    : currentCats.size
  const activeFilterCount = currentAttrs.size + userSelectedCatCount

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

          <div className="fixed inset-0 overflow-y-hidden ">
            <div className="flex min-h-full h-full justify-center p-4 text-center items-center ">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="flex flex-col w-full max-w-3xl transform text-left align-middle transition-all max-h-[80vh] bg-gold-10 shadow-xl border rounded-rounded ">
                  {/* Header */}
                  <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
                    <Dialog.Title className="text-2xl text-dark-blue">
                      {labels.filter}
                    </Dialog.Title>
                    <button
                      onClick={closeModal}
                      data-testid="close-filter-modal"
                      className="text-dark-blue hover:opacity-70 transition-opacity"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="overflow-y-auto flex-1 px-8 py-2 bg-gold-10">
                    {/* Category section */}
                    {facets.childCategories?.length > 0 && (
                      <div className="border-b border-gray-200 py-5">
                        <h3 className="text-xs font-bold text-dark-blue tracking-[0.2em] uppercase mb-4">
                          {labels.category}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {facets.childCategories.map((cat) => {
                            const selected = pendingCats.has(cat.id)
                            const disabled = cat.count === 0 && !selected
                            return (
                              <button
                                key={cat.id}
                                onClick={() => toggleCat(cat.id)}
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
                                {cat.name}
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
                                  ({cat.count})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Attribute groups */}
                    {facets.attributeGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border-b border-gray-200 py-5 last:border-b-0"
                      >
                        <h3 className="text-xs text-dark-blue tracking-[0.2em] uppercase mb-4">
                          {group.name}
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
                                    ? "bg-gold-10 text-gray-300 cursor-not-allowed border border-gray-200"
                                    : selected
                                    ? "bg-dark-blue text-white"
                                    : "bg-gold-20 text-dark-blue hover:bg-gold-200 border hover:border-gray-400"
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
                  <div className="flex flex-col gap-3 px-8 py-6 border-t border-gray-200 bg-gold-10">
                    <Button
                      onClick={apply}
                      data-testid="apply-filters-button"
                    >
                      {labels.showResults} ({facets.totalCount})
                    </Button>
                    <Button variant="outline" onClick={clearAll}>
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
