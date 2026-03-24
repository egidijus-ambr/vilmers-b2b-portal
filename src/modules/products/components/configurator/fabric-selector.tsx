"use client"

import React, { useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import FabricDrawer from "./fabric-drawer"
import type { FabricGroupWithPrice, FabricCombinationOption } from "@configurator/lib/types"

type FabricSelectorProps = {
  fabricGroups: FabricGroupWithPrice[]
  /** If provided, this selector is for a specific combination option */
  option: FabricCombinationOption | null
  /** Label shown on the compact row (e.g. "Fabric" or "Fabric (Seat)") */
  title?: string | null
  languageCode: string
}

/**
 * Compact fabric selector row.
 * Shows the currently selected fabric (thumbnail + group name + color_name).
 * Clicking opens a full-width drawer with search, grouped cards, and larger images.
 */
const FabricSelector = ({
  fabricGroups,
  option,
  title,
  languageCode,
}: FabricSelectorProps) => {
  const { state } = useConfigurator()
  const { selectedFabric } = state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Get current selection based on mode
  const currentSelection = option
    ? selectedFabric.combinationFabrics?.[option.id]
    : { fabricGroupObject: selectedFabric.fabricGroupObject, fabricObject: selectedFabric.fabricObject }

  const selectedGroup = currentSelection?.fabricGroupObject
  const selectedFabricObj = currentSelection?.fabricObject

  const groupName = selectedGroup
    ? getGroupName(selectedGroup, languageCode)
    : null

  const drawerTitle = title ?? "Fabric"

  return (
    <>
      {/* Compact clickable row */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors text-left"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-gray-50 border">
          {selectedFabricObj?.image?.src_xs ? (
            <img
              src={selectedFabricObj.image.src_xs}
              alt={selectedFabricObj.color_name ?? selectedFabricObj.code}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] text-gray-300">—</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
              {title}
            </p>
          )}
          {selectedFabricObj ? (
            <>
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFabricObj.color_name ?? selectedFabricObj.code}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {groupName}{selectedFabricObj.code ? ` · ${selectedFabricObj.code}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Select fabric...</p>
          )}
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Drawer */}
      <FabricDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        fabricGroups={fabricGroups}
        option={option}
        title={drawerTitle}
        languageCode={languageCode}
      />
    </>
  )
}

function getGroupName(group: FabricGroupWithPrice, languageCode: string): string {
  const profile = group.fabric_group_profiles?.find(
    (p) => p.language === languageCode
  ) ?? group.fabric_group_profiles?.[0]
  return profile?.name ?? group.code ?? `Group ${group.id}`
}

export default FabricSelector
