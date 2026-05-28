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

  const includedLinks = (
    selectedComponent?.linked_components_source ?? []
  ).filter((link) => link.link_type === "INCLUDES")
  const isWrapper = !!selectedComponent?.is_wrapper && includedLinks.length > 0

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative w-full h-20 border border-gray-300 hover:border-gray-500 bg-[#F2F0EF] transition-colors text-left overflow-hidden h-32"
      >
        {/* Image fills the full row */}
        <div className="absolute inset-0 bg-[#F2F0EF] ">
          {isWrapper ? (
            <div className="flex items-center justify-start gap-1 p-2 w-full h-full">
              {includedLinks.map((link) => {
                const target = link.target_component
                const targetSrc =
                  target?.image?.src_thumbnail ?? target?.image?.src_md
                if (!targetSrc) return null
                return (
                  <img
                    key={link.id}
                    src={targetSrc}
                    alt={target?.code ?? ""}
                    className="h-full w-[20%] object-cover object-left shrink-0"
                    loading="lazy"
                  />
                )
              })}
            </div>
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt={componentName}
              className="w-full h-full object-contain object-left"
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

        {/* Text + chevron block, overlaying the right side */}
        <div className="absolute right-0 top-0 bottom-0 w-3/5 flex items-end gap-3 px-4 z-10">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 min-w-0  bg-[#F2F0EF] p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                {groupName}
              </p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {componentName}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400 shrink-0  bg-[#F2F0EF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </button>

      <ComponentDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        group={group}
        validComponents={validComponents}
        title={groupName}
        languageCode={languageCode}
        uiType={group.ui_type}
      />
    </>
  )
}

export default ComponentSelector
