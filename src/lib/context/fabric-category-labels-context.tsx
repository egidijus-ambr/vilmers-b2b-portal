"use client"

import { createContext, useCallback, useContext, type ReactNode } from "react"
import {
  DEFAULT_FABRIC_CATEGORY_LABELS,
  getFabricCategoryLabel,
  type FabricCategoryLabels,
} from "../fabric-category-labels"

const FabricCategoryLabelsContext = createContext<FabricCategoryLabels>({
  ...DEFAULT_FABRIC_CATEGORY_LABELS,
})

export function FabricCategoryLabelsProvider({
  labels,
  children,
}: {
  labels: FabricCategoryLabels
  children: ReactNode
}) {
  return (
    <FabricCategoryLabelsContext.Provider value={labels}>
      {children}
    </FabricCategoryLabelsContext.Provider>
  )
}

/** Returns `(groupNumber) => label`; defaults apply without a provider. */
export function useFabricCategoryLabel(): (groupNumber: number | string | null | undefined) => string {
  const labels = useContext(FabricCategoryLabelsContext)
  return useCallback(
    (groupNumber) => getFabricCategoryLabel(labels, groupNumber),
    [labels]
  )
}
