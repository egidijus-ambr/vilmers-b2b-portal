"use client"

import React, { useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import FabricCombinationDrawer from "./fabric-combination-drawer"
import type { FabricCombination } from "@configurator/lib/types"

type FabricCombinationSelectorProps = {
  fabricCombinations: FabricCombination[]
  languageCode: string
}

const FabricCombinationSelector = ({
  fabricCombinations,
  languageCode,
}: FabricCombinationSelectorProps) => {
  const { state, dispatch } = useConfigurator()
  const selectedId = state.selectedFabricCombination.fabricCombination?.id ?? null
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedCombination = fabricCombinations.find((c) => c.id === selectedId) ?? fabricCombinations[0]

  const handleSelect = (combination: FabricCombination) => {
    dispatch({
      type: "SET_FABRIC_COMBINATION",
      payload: { fabricCombination: combination },
    })
  }

  const getName = (combination: FabricCombination) => {
    const profile = (combination as any).fabricCombinationProfiles?.find(
      (p: any) => p.language === languageCode
    ) ?? (combination as any).fabricCombinationProfiles?.[0]
    return profile?.name ?? combination.code ?? `Combination ${combination.id}`
  }

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Fabric combination
        </h4>

        {/* Compact row — shows selected combination image full-width */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-full text-left border border-gray-200 hover:border-gray-400 transition-colors overflow-hidden"
        >
          {/* Selected combination image */}
          {selectedCombination?.image?.src_md ? (
            <div className="w-full aspect-[16/9] bg-gray-50">
              <img
                src={selectedCombination.image.src_md}
                alt={getName(selectedCombination)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full aspect-[16/9] bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-400">No image</span>
            </div>
          )}

          {/* Label row */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-gray-900">
              {selectedCombination ? getName(selectedCombination) : "Select combination..."}
            </span>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Drawer */}
      <FabricCombinationDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        fabricCombinations={fabricCombinations}
        selectedId={selectedId}
        onSelect={handleSelect}
        getName={getName}
      />
    </>
  )
}

export default FabricCombinationSelector
