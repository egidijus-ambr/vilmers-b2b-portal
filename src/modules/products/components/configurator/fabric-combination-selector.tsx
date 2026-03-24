"use client"

import React from "react"
import { clx } from "@medusajs/ui"
import { useConfigurator } from "@configurator/context/configurator-context"
import type { FabricCombination } from "@configurator/lib/types"

type FabricCombinationSelectorProps = {
  fabricCombinations: FabricCombination[]
  languageCode: string
}

/**
 * Horizontal selector to switch between fabric combinations.
 * Only shown when there are multiple combinations (>1).
 * Each combination shows its name and optional image.
 */
const FabricCombinationSelector = ({
  fabricCombinations,
  languageCode,
}: FabricCombinationSelectorProps) => {
  const { state, dispatch } = useConfigurator()
  const selectedId = state.selectedFabricCombination.fabricCombination?.id ?? null

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
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Fabric combination
      </h4>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {fabricCombinations.map((combination) => {
          const isSelected = selectedId === combination.id
          return (
            <button
              key={combination.id}
              onClick={() => handleSelect(combination)}
              className={clx(
                "shrink-0 flex items-center gap-2 px-3 py-2 rounded border transition-colors text-sm",
                {
                  "bg-[#1e2a3a] text-white border-[#1e2a3a]": isSelected,
                  "bg-white text-gray-700 border-gray-300 hover:border-gray-500": !isSelected,
                }
              )}
            >
              {combination.image?.src_md && (
                <img
                  src={combination.image.src_md}
                  alt={getName(combination)}
                  className="w-8 h-8 rounded object-cover"
                />
              )}
              <span>{getName(combination)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default FabricCombinationSelector
