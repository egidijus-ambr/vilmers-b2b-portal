"use client"

import { FileText } from "lucide-react"
import { useTranslations } from "@lib/i18n"
import { useRequiredCatalogBuilder } from "@lib/context/catalog-builder-context"

export default function CatalogBuilderToolbar() {
  const { t } = useTranslations()
  const { selectionMode, toggleSelectionMode } = useRequiredCatalogBuilder()

  if (selectionMode) return null

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
