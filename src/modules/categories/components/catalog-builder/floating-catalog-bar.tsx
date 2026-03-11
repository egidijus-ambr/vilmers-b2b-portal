"use client"

import { useMemo, useRef, useState } from "react"
import { X, ChevronDown } from "lucide-react"
import { useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n"
import { useRequiredCatalogBuilder } from "@lib/context/catalog-builder-context"
import { getCatalogueLanguage } from "@lib/util/catalogue-language"
import { sdk } from "@lib/config"
import Spinner from "@modules/common/icons/spinner"

type WarningKind = "no-catalogue" | "no-language" | "no-units"

interface ProductWarning {
  product: string
  kind: WarningKind
}

export default function FloatingCatalogBar() {
  const { t } = useTranslations()
  const params = useParams()
  const language = (params?.languageCode as string) ?? "en"
  const catalogueLanguage = getCatalogueLanguage(language)

  const {
    selectionMode,
    toggleSelectionMode,
    selectedProducts,
    selectAll,
    deselectAll,
    catalogueMap,
    productNames,
  } = useRequiredCatalogBuilder()

  const [selectedUnits, setSelectedUnits] = useState("CM")
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const unitsRef = useRef<HTMLDivElement>(null)
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null)

  // Products that have catalogues (for select all)
  const selectableCount = useMemo(
    () => productNames.filter((n) => (catalogueMap[n] ?? []).length > 0).length,
    [productNames, catalogueMap]
  )

  const allSelected =
    selectableCount > 0 && selectedProducts.size === selectableCount

  // Validation warnings
  const warnings = useMemo<ProductWarning[]>(() => {
    const result: ProductWarning[] = []
    for (const product of Array.from(selectedProducts)) {
      const files = catalogueMap[product] ?? []
      if (files.length === 0) {
        result.push({ product, kind: "no-catalogue" })
        continue
      }
      const forLang = files.filter((f) => f.language === catalogueLanguage)
      if (forLang.length === 0) {
        result.push({ product, kind: "no-language" })
        continue
      }
      const forUnits = forLang.filter((f) => f.units === selectedUnits)
      if (forUnits.length === 0) {
        result.push({ product, kind: "no-units" })
      }
    }
    return result
  }, [catalogueMap, selectedProducts, catalogueLanguage, selectedUnits])

  const hasWarnings = warnings.length > 0

  // Download handler
  async function handleDownload() {
    if (selectedProducts.size === 0 || isDownloading) return
    setIsDownloading(true)
    try {
      const blob = await sdk.productCatalogues.mergeCatalogues({
        productNames: Array.from(selectedProducts),
        language: catalogueLanguage,
        units: selectedUnits,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "catalog.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Catalog download failed:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  function getWarningMessage(w: ProductWarning): string {
    if (w.kind === "no-catalogue")
      return t("warning-no-catalogue", { product: w.product })
    if (w.kind === "no-language")
      return t("warning-no-language", {
        product: w.product,
        language: catalogueLanguage,
      })
    return t("warning-no-units", { product: w.product, units: selectedUnits })
  }

  if (!selectionMode) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none animate-fade-in-top">
      <div className="bg-white rounded-full shadow-lg border border-gray-200 px-2 py-1.5 pointer-events-auto max-w-[95vw] flex flex-wrap items-center justify-center gap-y-1">
        {/* Select all / Deselect all */}
        <button
          onClick={allSelected ? deselectAll : selectAll}
          className="px-4 py-2 text-sm font-medium text-white bg-gold hover:bg-gold/90 rounded-full transition-colors whitespace-nowrap"
        >
          {allSelected ? t("deselect-all") : t("select-all")}
        </button>

        <Divider />

        {/* Download selected (count) with warning badge */}
        <div
          className="relative px-3 py-2 text-sm text-gray-700 whitespace-nowrap"
          onMouseEnter={() => {
            if (hasWarnings) {
              tooltipTimeout.current = setTimeout(
                () => setTooltipVisible(true),
                300
              )
            }
          }}
          onMouseLeave={() => {
            if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
            setTooltipVisible(false)
          }}
        >
          {t("download-selected", { count: selectedProducts.size })}
          {hasWarnings && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-amber-500 rounded-full">
              {warnings.length}
            </span>
          )}

          {/* Warning tooltip */}
          {tooltipVisible && hasWarnings && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-[80]">
              <div className="flex flex-col gap-1.5">
                {warnings.map((w) => (
                  <p key={`${w.product}-${w.kind}`}>
                    {getWarningMessage(w)}
                  </p>
                ))}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </div>

        <Divider />

        {/* Units dropdown */}
        <div ref={unitsRef} className="relative">
          <button
            onClick={() => setUnitsOpen(!unitsOpen)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            {selectedUnits.toLowerCase()}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${unitsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {unitsOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[80px] z-[80]">
              {["CM", "IN"].map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    setSelectedUnits(unit)
                    setUnitsOpen(false)
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    selectedUnits === unit
                      ? "text-gold font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {unit.toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder: Merge pages */}
        <PlaceholderDropdown label={t("merge-pages")} />

        {/* Placeholder: Uncompressed */}
        <PlaceholderDropdown label={t("uncompressed")} />

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={selectedProducts.size === 0 || isDownloading}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gold hover:bg-gold/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("download")}
        >
          {isDownloading ? (
            <Spinner size="16" color="white" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v8m0 0L5 7m3 3l3-3M3 12h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Close button */}
        <button
          onClick={toggleSelectionMode}
          className="flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-700 transition-colors"
          title={t("cancel")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />
}

function PlaceholderDropdown({ label }: { label: string }) {
  return (
    <button
      disabled
      className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 cursor-not-allowed whitespace-nowrap"
    >
      {label}
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  )
}
