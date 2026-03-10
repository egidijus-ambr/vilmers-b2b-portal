"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "@lib/i18n"
import { sdk } from "@lib/config"
import { getCatalogueLanguage } from "@lib/util/catalogue-language"
import { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import Radio from "@modules/common/components/radio"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when at least one of the selected products has both CM and IN
 * catalogue variants for the given language.
 */
export function hasMultipleUnitsVariants(
  catalogueMap: Record<string, CatalogueFile[]>,
  selectedProducts: Set<string>,
  language: string
): boolean {
  for (const name of Array.from(selectedProducts)) {
    const files = catalogueMap[name] ?? []
    const forLang = files.filter((f) => f.language === language)
    const units = new Set(forLang.map((f) => f.units))
    if (units.has("CM") && units.has("IN")) {
      return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "configure" | "loading" | "error"

type WarningKind = "no-catalogue" | "no-language" | "no-units"

interface ProductWarning {
  product: string
  kind: WarningKind
}

interface CatalogueModalProps {
  isOpen: boolean
  close: () => void
  language: string
  selectedProducts: Set<string>
  catalogueMap: Record<string, CatalogueFile[]>
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CatalogueModal({
  isOpen,
  close,
  language,
  selectedProducts,
  catalogueMap,
  onSuccess,
}: CatalogueModalProps) {
  const { t } = useTranslations()

  const [phase, setPhase] = useState<Phase>("configure")
  const [selectedUnits, setSelectedUnits] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("configure")
      setSelectedUnits(null)
      setErrorMessage(null)
    }
  }, [isOpen])

  const catalogueLanguage = getCatalogueLanguage(language)

  const needsUnitsSelection = useMemo(
    () => hasMultipleUnitsVariants(catalogueMap, selectedProducts, catalogueLanguage),
    [catalogueMap, selectedProducts, catalogueLanguage]
  )

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
      if (selectedUnits !== null) {
        const forUnits = forLang.filter((f) => f.units === selectedUnits)
        if (forUnits.length === 0) {
          result.push({ product, kind: "no-units" })
        }
      }
    }
    return result
  }, [catalogueMap, selectedProducts, catalogueLanguage, selectedUnits])

  const hasValidProducts = warnings.length < selectedProducts.size
  const canProceed =
    hasValidProducts && (!needsUnitsSelection || selectedUnits !== null)

  const handleClose = () => {
    if (phase !== "loading") close()
  }

  async function handleAction(action: "download" | "view") {
    setPhase("loading")
    try {
      const blob = await sdk.productCatalogues.mergeCatalogues({
        productNames: Array.from(selectedProducts),
        language: catalogueLanguage,
        units: selectedUnits ?? undefined,
      })

      if (action === "download") {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "catalog.pdf"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank")
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }

      close()
      onSuccess()
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("merge-error-generic")
      )
      setPhase("error")
    }
  }

  const allInvalid = warnings.length === selectedProducts.size

  return (
    <Modal isOpen={isOpen} close={handleClose} size="medium">
      <Modal.Title>{t("catalogue-modal-title")}</Modal.Title>

      <Modal.Body>
        <div className="w-full py-4 flex flex-col gap-4">
          {/* Configure phase */}
          {phase === "configure" && (
            <>
              {/* Units selector */}
              {needsUnitsSelection && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {t("select-measurement")}
                  </p>
                  <div className="flex flex-col gap-2">
                    {(["CM", "IN"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setSelectedUnits(unit)}
                        className="flex items-center gap-3 px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Radio checked={selectedUnits === unit} />
                        <span className="text-sm text-gray-800">
                          {unit === "CM" ? t("centimeters") : t("inches")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation warnings */}
              {warnings.length > 0 && (
                <div className="flex flex-col gap-1">
                  {allInvalid && (
                    <p className="text-sm text-red-600 font-medium mb-1">
                      {t("no-valid-catalogues")}
                    </p>
                  )}
                  {warnings.map(({ product, kind }) => {
                    let message: string
                    if (kind === "no-catalogue") {
                      message = t("warning-no-catalogue", { product })
                    } else if (kind === "no-language") {
                      message = t("warning-no-language", {
                        product,
                        language: catalogueLanguage,
                      })
                    } else {
                      message = t("warning-no-units", {
                        product,
                        units: selectedUnits ?? "",
                      })
                    }
                    return (
                      <p
                        key={`${product}-${kind}`}
                        className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5"
                      >
                        {message}
                      </p>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Loading phase */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Spinner size="32" color="#1e3a5f" />
              <p className="text-sm text-gray-600">{t("generating-catalog")}</p>
            </div>
          )}

          {/* Error phase */}
          {phase === "error" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3">
                {errorMessage ?? t("merge-error-generic")}
              </p>
            </div>
          )}
        </div>
      </Modal.Body>

      {/* Footer */}
      {phase === "configure" && (
        <Modal.Footer>
          <button
            onClick={handleClose}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => handleAction("view")}
            disabled={!canProceed}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-dark-blue border border-dark-blue hover:bg-dark-blue/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("view-pdf")}
          </button>
          <button
            onClick={() => handleAction("download")}
            disabled={!canProceed}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-dark-blue hover:bg-dark-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("download")}
          </button>
        </Modal.Footer>
      )}

      {phase === "error" && (
        <Modal.Footer>
          <button
            onClick={handleClose}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => setPhase("configure")}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-dark-blue hover:bg-dark-blue/90 transition-colors"
          >
            {t("back")}
          </button>
        </Modal.Footer>
      )}
    </Modal>
  )
}
