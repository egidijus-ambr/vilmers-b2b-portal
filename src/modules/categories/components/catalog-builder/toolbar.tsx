"use client"

import { useTranslations } from "@lib/i18n"
import { useRequiredCatalogBuilder } from "@lib/context/catalog-builder-context"
import { CatalogDownloadIcon } from "@modules/common/icons/catalog-download"

export default function CatalogBuilderToolbar() {
  const { t } = useTranslations()
  const { selectionMode, toggleSelectionMode } = useRequiredCatalogBuilder()

  if (selectionMode) return null

  return (
    <button
      onClick={toggleSelectionMode}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gold hover:text-gold/80 transition-colors"
    >
      <CatalogDownloadIcon className="w-[18px] h-[18px] flex-shrink-0" />
      {t("create-catalog")}
    </button>
  )
}
