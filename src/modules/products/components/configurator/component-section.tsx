"use client"

import React from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import ComponentSelector from "./component-selector"
import { getValidComponents } from "@configurator/lib/component-utils"
import { isHidden } from "@configurator/lib/ui-type"
import type { ComponentGroup } from "@configurator/lib/types"

type ComponentSectionProps = {
  groups: ComponentGroup[]
  languageCode: string
  priceListIds?: number[]
  showAllProducts?: boolean
}

const ComponentSection = ({
  groups,
  languageCode,
  priceListIds,
  showAllProducts,
}: ComponentSectionProps) => {
  const { state } = useConfigurator()
  const options = { priceListIds, showAllProducts }

  // Filter to only visible groups (>1 valid component, not hidden)
  const visibleGroups = groups
    .filter((group) => {
      if (isHidden(group.ui_type)) return false
      const valid = getValidComponents(
        group,
        state.selectedAdditionalComponents,
        state.sofaCombinations,
        options
      )
      return valid.length > 1
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  if (visibleGroups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">No options available for this step</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => {
        const validComponents = getValidComponents(
          group,
          state.selectedAdditionalComponents,
          state.sofaCombinations,
          options
        )
        return (
          <ComponentSelector
            key={group.code}
            group={group}
            validComponents={validComponents}
            languageCode={languageCode}
          />
        )
      })}
    </div>
  )
}

export default ComponentSection
