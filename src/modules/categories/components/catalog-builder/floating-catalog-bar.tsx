"use client"

import { useMemo, useRef, useState } from "react"
import { X, ChevronDown } from "lucide-react"
import { useTranslations } from "@lib/i18n"
import { useRequiredCatalogBuilder } from "@lib/context/catalog-builder-context"
import { useCustomer } from "@lib/context/customer-context"
import { getCustomerMarket } from "@lib/util/customer-market"
import { sdk } from "@lib/config"
import Spinner from "@modules/common/icons/spinner"

type WarningKind = "no-catalogue" | "no-market"

interface ProductWarning {
  product: string
  kind: WarningKind
}

export default function FloatingCatalogBar() {
  const { t } = useTranslations()

  const {
    selectionMode,
    toggleSelectionMode,
    selectedProducts,
    selectAll,
    deselectAll,
    catalogueMap,
    allProductNamesLoading,
    referenceByName,
  } = useRequiredCatalogBuilder()

  const { customer } = useCustomer()
  const customerMarket = getCustomerMarket(customer)

  const [selectedMode, setSelectedMode] = useState<"merge" | "split">("merge")
  const [modeOpen, setModeOpen] = useState(false)
  const [compressed, setCompressed] = useState(false)
  const [compressionOpen, setCompressionOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipTimeout = useRef<NodeJS.Timeout | null>(null)

  // Validation warnings for selected products
  const warnings = useMemo<ProductWarning[]>(() => {
    const result: ProductWarning[] = []
    for (const product of Array.from(selectedProducts)) {
      const files = catalogueMap[product] ?? []
      if (files.length === 0) {
        // Skip warnings for products whose catalogues haven't been fetched yet
        if (!(product in catalogueMap)) continue
        result.push({ product, kind: "no-catalogue" })
        continue
      }
      if (customerMarket) {
        const forMarket = files.filter((f) => f.market === customerMarket)
        if (forMarket.length === 0) {
          result.push({ product, kind: "no-market" })
        }
      }
    }
    return result
  }, [catalogueMap, selectedProducts, customerMarket])

  const hasWarnings = warnings.length > 0

  // Download handler
  async function handleDownload() {
    if (selectedProducts.size === 0 || isDownloading) return
    setIsDownloading(true)
    try {
      const productNames = Array.from(selectedProducts)
      const productReferences = productNames.map((n) => referenceByName[n])
      const blob = await sdk.productCatalogues.mergeCatalogues({
        productNames,
        productReferences,
        market: customerMarket ?? "EN",
        mode: selectedMode,
        compressed,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = selectedMode === "split" ? "collection.zip" : "catalog.pdf"
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
    return t("warning-no-market", {
      product: w.product,
      market: customerMarket ?? "",
    })
  }

  if (!selectionMode) return null

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[70] flex justify-start small:justify-center pl-4 pr-0 small:px-4 pointer-events-none animate-fade-in-top">
      {/*
        Mobile: vertical card (w-2/3, rounded-2xl, flex-col, p-4, gap-2, relative)
        Desktop (small:): restore original horizontal pill
          - small:w-auto          — remove 2/3 width cap
          - small:max-w-[95vw]    — restore original safety cap
          - small:rounded-full    — pill shape
          - small:px-2 small:py-1.5 — original padding
          - small:flex-row small:flex-wrap — horizontal layout
          - small:items-center small:justify-center — original alignment
          - small:gap-x-0 small:gap-y-1 — original gap (no x-gap, y-gap 1)
          - relative              — needed to anchor the mobile absolute close button
      */}
      <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 p-4 pointer-events-auto w-2/3 flex flex-col gap-2 small:w-auto small:max-w-[95vw] small:rounded-full small:px-2 small:py-1.5 small:flex-row small:flex-wrap small:items-center small:justify-center small:gap-x-0 small:gap-y-1">

        {/* Mobile-only close button — absolutely positioned top-right of the card */}
        <button
          onClick={toggleSelectionMode}
          className="small:hidden absolute top-2 right-2 flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-700 transition-colors"
          title={t("cancel")}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Select all / Deselect all */}
        <button
          onClick={selectedProducts.size > 0 ? deselectAll : () => selectAll()}
          disabled={allProductNamesLoading}
          className="w-1/2 small:w-auto px-4 py-2 text-sm font-medium text-white bg-gold hover:bg-gold/90 rounded-full transition-colors whitespace-nowrap disabled:opacity-70"
        >
          {allProductNamesLoading ? (
            <span className="flex items-center gap-2">
              <Spinner size="14" color="white" />
              {t("select-all")}
            </span>
          ) : selectedProducts.size > 0 ? (
            t("deselect-all")
          ) : (
            t("select-all")
          )}
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
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
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

        {/* Merge/Split dropdown */}
        <div className="relative w-full small:w-auto">
          <button
            onClick={() => setModeOpen(!modeOpen)}
            className="flex items-center gap-1 w-full justify-between small:w-auto small:justify-start px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            {selectedMode === "merge" ? t("merge-pages") : t("split-pages")}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${modeOpen ? "rotate-180" : ""}`}
            />
          </button>
          {modeOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-[80]">
              {(["merge", "split"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMode(m)
                    setModeOpen(false)
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    selectedMode === m
                      ? "text-gold font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {m === "merge" ? t("merge-pages") : t("split-pages")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compression dropdown */}
        <div className="relative w-full small:w-auto">
          <button
            onClick={() => setCompressionOpen(!compressionOpen)}
            className="flex items-center gap-1 w-full justify-between small:w-auto small:justify-start px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors whitespace-nowrap"
          >
            {compressed ? t("compressed") : t("uncompressed")}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${compressionOpen ? "rotate-180" : ""}`}
            />
          </button>
          {compressionOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-[80]">
              {[false, true].map((c) => (
                <button
                  key={String(c)}
                  onClick={() => {
                    setCompressed(c)
                    setCompressionOpen(false)
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    compressed === c
                      ? "text-gold font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {c ? t("compressed") : t("uncompressed")}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download button
            Mobile: full-width gold button with label
            Desktop (small:): original w-9 h-9 rounded-full icon-only button
        */}
        <button
          onClick={handleDownload}
          disabled={selectedProducts.size === 0 || isDownloading}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gold hover:bg-gold/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed small:w-9 small:h-9 small:py-0 small:rounded-full small:gap-0"
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
          <span className="small:hidden text-sm font-medium">{t("download")}</span>
        </button>

        {/* Close button — desktop only (mobile uses the absolute button above) */}
        <button
          onClick={toggleSelectionMode}
          className="hidden small:flex items-center justify-center w-9 h-9 text-gray-500 hover:text-gray-700 transition-colors"
          title={t("cancel")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="hidden small:block w-px h-6 bg-gray-200 mx-1" />
}
