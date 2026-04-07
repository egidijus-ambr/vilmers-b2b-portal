"use client"

import React, { useMemo, useState, Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { useConfigurator } from "@configurator/context/configurator-context"
import FabricDrawerCard from "./fabric-drawer-card"
import type { FabricGroupWithPrice, FabricCombinationOption } from "@configurator/lib/types"
import { useCustomerPaletteIds, getGroupName } from "@configurator/lib/palette-utils"

type FabricDrawerProps = {
  isOpen: boolean
  close: () => void
  fabricGroups: FabricGroupWithPrice[]
  /** If set, selecting a fabric updates this combination option */
  option: FabricCombinationOption | null
  title: string
  languageCode: string
}

/**
 * Slide-in drawer for fabric selection.
 * Shows search input + fabric groups as sections with larger cards.
 * Matches storefront FabricsDrawer pattern.
 */
const FabricDrawer = ({
  isOpen,
  close,
  fabricGroups,
  option,
  title,
  languageCode,
}: FabricDrawerProps) => {
  const { state, dispatch } = useConfigurator()
  const { selectedFabric } = state
  const [searchValue, setSearchValue] = useState("")

  const customerPaletteIds = useCustomerPaletteIds()

  // Current selected fabric id for highlighting
  const selectedFabricId = option
    ? selectedFabric.combinationFabrics?.[option.id]?.fabricObject?.id ?? null
    : selectedFabric.fabricObject?.id ?? null

  // Filter fabric groups by search
  const filteredGroups = useMemo(() => {
    if (!searchValue || searchValue.length < 2) {
      return fabricGroups
    }
    const query = searchValue.toLowerCase()

    return fabricGroups
      .map((group) => {
        const groupName = getGroupName(group, languageCode, customerPaletteIds)
        const originalName = getGroupName(group, languageCode)

        // If group name (override or original) matches, return all fabrics
        if (
          groupName.toLowerCase().includes(query) ||
          originalName.toLowerCase().includes(query)
        ) {
          return group
        }

        // Otherwise filter fabrics by code or color_name
        const matchingFabrics = group.fabrics.filter(
          (f) =>
            f.code?.toLowerCase().includes(query) ||
            f.color_name?.toLowerCase().includes(query)
        )

        if (matchingFabrics.length === 0) return null

        return { ...group, fabrics: matchingFabrics }
      })
      .filter(Boolean) as FabricGroupWithPrice[]
  }, [fabricGroups, searchValue, languageCode, customerPaletteIds])

  const handleFabricSelect = (fabric: any, fabricGroup: FabricGroupWithPrice) => {
    if (option) {
      // Combination mode
      dispatch({
        type: "SET_FABRIC",
        payload: {
          ...selectedFabric,
          fabricGroupObject: fabricGroup,
          fabricObject: fabric,
          combinationFabrics: {
            ...selectedFabric.combinationFabrics,
            [option.id]: {
              fabricGroupObject: fabricGroup,
              fabricObject: fabric,
              option,
            },
          },
        },
      })
    } else {
      // Single mode
      dispatch({
        type: "SET_FABRIC",
        payload: {
          fabricGroupObject: fabricGroup,
          fabricObject: fabric,
          combinationFabrics: null,
        },
      })
    }

    setSearchValue("")
    close()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
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
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Drawer panel - slides from right */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-[700px] bg-gold-20 shadow-xl flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Dialog.Title className="text-lg font-semibold">
                      {title}
                    </Dialog.Title>
                    <button
                      onClick={close}
                      className="p-1 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="px-6 py-3">
                    <input
                      type="search"
                      placeholder="Search fabrics..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1e2a3a] focus:border-[#1e2a3a]"
                    />
                  </div>

                  {/* Scrollable fabric list */}
                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {filteredGroups.map((fabricGroup) => {
                      const groupName = getGroupName(fabricGroup, languageCode, customerPaletteIds)
                      const catNumber = fabricGroup.form_price_fabric_category?.group_number

                      // Sort fabrics by color_name
                      const sortedFabrics = [...fabricGroup.fabrics].sort((a, b) =>
                        (a.color_name ?? a.code).localeCompare(b.color_name ?? b.code)
                      )

                      return (
                        <div key={fabricGroup.id} className="mb-4">
                          {/* Group header */}
                          <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-2">
                            <span className="text-sm font-medium text-gray-800">
                              {groupName}
                            </span>
                            {catNumber != null && (
                              <span className="text-xs text-gray-500">
                                CAT {catNumber}
                              </span>
                            )}
                          </div>

                          {/* Fabric cards grid */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {sortedFabrics.map((fabric) => (
                              <FabricDrawerCard
                                key={fabric.id}
                                fabric={fabric}
                                isSelected={selectedFabricId === fabric.id}
                                onClick={() => handleFabricSelect(fabric, fabricGroup)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {filteredGroups.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-8">
                        No fabrics match your search
                      </p>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default FabricDrawer
