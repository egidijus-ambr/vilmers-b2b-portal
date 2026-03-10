"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { useTranslations } from "@lib/i18n"
import { useRequiredCatalogBuilder } from "@lib/context/catalog-builder-context"
import CatalogueModal from "./catalogue-modal"

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface CatalogBuilderToolbarProps {
  /** The current UI language code, e.g. "en" | "de" | "fr" */
  language: string
}

export default function CatalogBuilderToolbar({
  language,
}: CatalogBuilderToolbarProps) {
  const { t } = useTranslations()
  const {
    selectionMode,
    toggleSelectionMode,
    selectedProducts,
    catalogueMap,
  } = useRequiredCatalogBuilder()

  const [showModal, setShowModal] = useState(false)

  // ----- Default state -----
  if (!selectionMode) {
    return (
      <button
        onClick={toggleSelectionMode}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-blue border border-dark-blue hover:bg-dark-blue hover:text-white transition-colors"
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        {t("create-catalog")}
      </button>
    )
  }

  // ----- Selection active state -----
  return (
    <>
      <CatalogueModal
        isOpen={showModal}
        close={() => setShowModal(false)}
        language={language}
        selectedProducts={selectedProducts}
        catalogueMap={catalogueMap}
        onSuccess={toggleSelectionMode}
      />

      <div className="flex items-center gap-3">
        {/* Selected count */}
        <span className="text-sm text-gray-600">
          {t("products-selected", { count: selectedProducts.size })}
        </span>

        {/* Cancel */}
        <button
          onClick={toggleSelectionMode}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {t("cancel")}
        </button>

        {/* Generate PDF */}
        <button
          onClick={() => setShowModal(true)}
          disabled={selectedProducts.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-dark-blue hover:bg-dark-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("generate-pdf")}
        </button>
      </div>
    </>
  )
}
