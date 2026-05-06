"use client"

import React, { useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import ComponentDrawer from "./component-drawer"
import type {
  ComponentGroup,
  AdditionalComponent,
} from "@configurator/lib/types"
import {
  getComponentName,
  getGroupName,
} from "@configurator/lib/component-utils"

type ComponentSelectorProps = {
  group: ComponentGroup
  validComponents: AdditionalComponent[]
  languageCode: string
}

const ComponentSelector = ({
  group,
  validComponents,
  languageCode,
}: ComponentSelectorProps) => {
  const { state } = useConfigurator()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedComponent = state.selectedAdditionalComponents.find(
    (c) => c.groupCode === group.code
  )

  const groupName = getGroupName(group, languageCode)
  const componentName = selectedComponent
    ? getComponentName(selectedComponent, languageCode)
    : "Select..."

  const imageSrc =
    selectedComponent?.image?.src_md ??
    selectedComponent?.image?.src_xs ??
    selectedComponent?.image?.src

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full flex items-end gap-3 pr-4 border border-gray-200 hover:border-gray-400 transition-colors text-left"
      >
        {/* Thumbnail */}
        <div className="w-32 h-32 shrink-0 overflow-hidden bg-[#F2F0EF] border-r border-gray-200">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={componentName}
              className="w-full h-full object-cover"
            />
          ) : selectedComponent?.color?.hex ? (
            <div
              className="w-full h-full"
              style={{ backgroundColor: selectedComponent.color.hex }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] text-gray-300">—</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            {groupName}
          </p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {componentName}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className="w-4 h-8 text-gray-400 shrink-0 pb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <ComponentDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        group={group}
        validComponents={validComponents}
        title={groupName}
        languageCode={languageCode}
      />
    </>
  )
}

export default ComponentSelector
