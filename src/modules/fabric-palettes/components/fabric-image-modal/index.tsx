"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Info } from "lucide-react"
import ResponsiveDialog from "@modules/common/components/responsive-dialog"
import Button from "@modules/common/components/button"
import type { FabricGroupDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations } from "@lib/i18n"
import { useFabricGroupDetails } from "../../hooks/use-fabric-group-details"
import { resolveProfile } from "../../utils/fabric-profile-helpers"
import {
  FabricTextFeaturesGrid,
  FabricCharacteristicsDisplay,
} from "../fabric-feature-display"
import type {
  FabricCalloutSettings,
  LocaleMap,
} from "@lib/data/fabric-callout-settings"
import { activeTheme } from "themes"
import { toast } from "@medusajs/ui"

function resolveCalloutMessage(
  map: LocaleMap | null | undefined,
  languageCode: string,
  fallback: string
): string {
  if (!map) return fallback
  const locale = languageCode as keyof LocaleMap
  const fromLocale = map[locale]
  if (fromLocale) return fromLocale
  const fromEn = map["en"]
  if (fromEn) return fromEn
  return fallback
}

interface FabricImageModalProps {
  isOpen: boolean
  onClose: () => void
  fabricName: string
  imageSrc: string
  groupData: FabricGroupDetail
  languageCode: string
  itemId?: string
  configId?: string
  calloutSettings?: FabricCalloutSettings | null
}

interface StockState {
  loading: boolean
  totalQty: number | null
}

const INITIAL_STOCK_STATE: StockState = {
  loading: false,
  totalQty: null,
}

export default function FabricImageModal({
  isOpen,
  onClose,
  fabricName,
  imageSrc,
  groupData,
  languageCode,
  itemId,
  configId,
  calloutSettings,
}: FabricImageModalProps) {
  const { t } = useTranslations("account")
  const { priceCategory, featuresWithPhoto, featureGroups } =
    useFabricGroupDetails(groupData, languageCode)

  const resolvedGroupName = (() => {
    const profile = resolveProfile(
      groupData.fabric_group_profiles,
      languageCode
    )
    return (profile as any)?.name ?? null
  })()

  const [stock, setStock] = useState<StockState>(INITIAL_STOCK_STATE)
  const requestIdRef = useRef(0)

  // Reset stock state when modal opens or fabric identifiers change.
  useEffect(() => {
    requestIdRef.current += 1
    setStock(INITIAL_STOCK_STATE)
  }, [isOpen, itemId, configId])

  const formatQty = (qty: number): string => {
    try {
      return qty.toLocaleString(languageCode, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
    } catch {
      return qty.toFixed(1)
    }
  }

  const handleCheckStock = async () => {
    if (activeTheme.demoMode) {
      toast.info(t("fabric-palettes.demo-action-disabled"))
      return
    }
    if (!itemId || !configId) return
    requestIdRef.current += 1
    const myRequestId = requestIdRef.current
    const isCancelled = () => requestIdRef.current !== myRequestId
    setStock({ loading: true, totalQty: null })
    try {
      const res = await fetch("/api/fabric-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, configId }),
      })
      const data = (await res.json()) as {
        totalQty: number | null
        error: string | null
      }
      if (isCancelled()) return
      if (data.totalQty === null) {
        setStock({ loading: false, totalQty: null })
        return
      }
      setStock({ loading: false, totalQty: data.totalQty })
    } catch {
      if (isCancelled()) return
      setStock({ loading: false, totalQty: null })
    }
  }

  const showStockSection = isOpen && !!itemId && !!configId

  console.log("Rendering FabricImageModal", {
    calloutSettings,
  })

  return (
    <ResponsiveDialog isOpen={isOpen} onClose={onClose} title={fabricName}>
      {/* Content: Image + Details */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Image */}
        <div className="flex-1 min-h-[40vh] md:min-h-0 flex items-center justify-center overflow-hidden bg-gold-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={fabricName}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details Panel */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 md:overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 p-6">
          {/* Group Name */}
          {resolvedGroupName && (
            <h3 className="text-xl font-semibold text-dark-blue">
              {resolvedGroupName}
            </h3>
          )}
          {/* Price Category */}
          {priceCategory && (
            <p className="text-sm text-gold tracking-wider uppercase mt-1">
              {priceCategory}
            </p>
          )}

          {showStockSection && (
            <div className="mt-6 text-sm">
              {stock.totalQty !== null ? (
                <>
                  <p className="text-dark-blue">
                    {t("fabric-palettes.stock-available", {
                      qty: formatQty(stock.totalQty),
                    })}
                  </p>
                  {(() => {
                    const threshold =
                      calloutSettings != null
                        ? Number.isNaN(calloutSettings.threshold)
                          ? 50
                          : calloutSettings.threshold
                        : 50
                    const isLow = stock.totalQty < threshold
                    const Icon = isLow ? AlertTriangle : Info
                    const message = isLow
                      ? resolveCalloutMessage(
                          calloutSettings?.lowMessage,
                          languageCode,
                          t("fabric-palettes.stock-low-message")
                        )
                      : resolveCalloutMessage(
                          calloutSettings?.plentyMessage,
                          languageCode,
                          t("fabric-palettes.stock-plenty-message")
                        )
                    return (
                      <div
                        className={`mt-3 flex items-start gap-2 rounded p-3 ${
                          isLow
                            ? "bg-red-50 text-red-800"
                            : "bg-green-50 text-green-800"
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p>{message}</p>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleCheckStock}
                  disabled={stock.loading}
                >
                  {stock.loading
                    ? t("fabric-palettes.stock-loading")
                    : t("fabric-palettes.stock-check-button")}
                </Button>
              )}
            </div>
          )}

          <FabricTextFeaturesGrid
            featureGroups={featureGroups}
            languageCode={languageCode}
            className="mt-6"
          />

          <FabricCharacteristicsDisplay
            features={featuresWithPhoto}
            languageCode={languageCode}
            showHeading
            className="mt-6"
          />
        </div>
      </div>
    </ResponsiveDialog>
  )
}
