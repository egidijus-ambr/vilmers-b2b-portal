"use client"

import { useCatalogBuilder } from "@lib/context/catalog-builder-context"

interface SelectionCheckboxProps {
  productName: string
}

export default function SelectionCheckbox({
  productName,
}: SelectionCheckboxProps) {
  const context = useCatalogBuilder()

  // Don't render outside CatalogBuilderProvider or when selection mode is off
  if (!context?.selectionMode) return null

  const { selectedProducts, toggleProduct, catalogueMap } = context

  // Only show checkbox for products that have PDF catalogues
  const hasCatalogues = (catalogueMap[productName] ?? []).length > 0
  if (!hasCatalogues) return null

  const isChecked = selectedProducts.has(productName)

  return (
    <button
      type="button"
      aria-label={`Select ${productName}`}
      aria-checked={isChecked}
      role="checkbox"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleProduct(productName)
      }}
      className={`flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer transition-colors ${
        isChecked ? "border-gold bg-gold" : "border-gold bg-gold-20"
      }`}
    >
      {isChecked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
