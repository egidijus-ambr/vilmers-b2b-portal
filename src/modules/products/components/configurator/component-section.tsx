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
  multiEntryCustomerComponentCodesByGroup?: Map<string, Set<string>>
}

const ComponentSection = ({
  groups,
  languageCode,
  priceListIds,
  showAllProducts,
  multiEntryCustomerComponentCodesByGroup = new Map(),
}: ComponentSectionProps) => {
  const { state } = useConfigurator()
  const applyMultiEntryFilter = (components: ReturnType<typeof getValidComponents>, groupCode: string) => {
    const customerCodes = multiEntryCustomerComponentCodesByGroup.get(groupCode)
    if (!customerCodes) return components
    return components.filter((c) => customerCodes.has(c.code))
  }

  const getOptions = (groupCode: string) => ({
    priceListIds,
    showAllProducts,
    customerComponentCodesForGroup: multiEntryCustomerComponentCodesByGroup.get(groupCode),
  })

  const visibleGroups = groups
    .filter((group) => {
      if (isHidden(group.ui_type)) return false
      const valid = applyMultiEntryFilter(
        getValidComponents(
          group,
          state.selectedAdditionalComponents,
          state.sofaCombinations,
          getOptions(group.code)
        ),
        group.code
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
        const validComponents = applyMultiEntryFilter(
          getValidComponents(
            group,
            state.selectedAdditionalComponents,
            state.sofaCombinations,
            getOptions(group.code)
          ),
          group.code
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
