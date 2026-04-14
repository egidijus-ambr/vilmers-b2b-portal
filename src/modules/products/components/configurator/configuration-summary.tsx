"use client"

import React from "react"
import SofaSetCard from "./sofa-set-card"
import { useConfigurator } from "@configurator/context/configurator-context"
import {
  getComponentName,
  getGroupName,
} from "@configurator/lib/component-utils"
import type {
  FabricGroupWithPrice,
  Fabric,
  FabricCombinationOption,
  SelectedComponent,
  ComponentGroup,
} from "@configurator/lib/types"
import { useTranslations, getBackendLanguageCode } from "@lib/i18n"

// =============================================
// Types
// =============================================

type ConfigurationSummaryProps = {
  languageCode: string
}

// =============================================
// Helpers
// =============================================

const EXCLUDED_GROUP_CODES = ["shooting", "threads-type", "market", "direction"]

function getFabricGroupName(
  fabricGroupObject: FabricGroupWithPrice,
  backendLang: string
): string {
  const profile =
    fabricGroupObject.fabric_group_profiles?.find(
      (p) => p.language === backendLang
    ) ?? fabricGroupObject.fabric_group_profiles?.[0]
  return profile?.name ?? fabricGroupObject.name ?? ""
}

function getOptionName(
  option: FabricCombinationOption,
  backendLang: string
): string {
  const profile =
    option.profiles?.find((p) => p.language === backendLang) ??
    option.profiles?.[0]
  return profile?.name ?? option.name ?? ""
}

// =============================================
// Sub-renderers
// =============================================

interface FabricCardProps {
  fabric: Fabric
  groupName: string
  optionLabel?: string
}

const FabricCard: React.FC<FabricCardProps> = ({
  fabric,
  groupName,
  optionLabel,
}) => {
  const imgSrc =
    fabric.image?.src_xs || fabric.image?.src_md || fabric.image?.src
  const { t } = useTranslations("account")

  return (
    <div className="flex bg-gold-20 rounded border border-gray-100 overflow-hidden">
      {imgSrc && (
        <img
          src={imgSrc}
          alt={fabric.code || ""}
          className="w-28 h-28 object-cover flex-shrink-0"
        />
      )}
      <div className="p-2 text-xs space-y-0.5 min-w-0">
        {optionLabel && (
          <p className="font-medium text-dark-blue">{optionLabel}</p>
        )}
        {groupName && (
          <p className="text-dark-blue-70">
            {t("group")}:{" "}
            <span className="font-semibold text-dark-blue">{groupName}</span>
          </p>
        )}
        {fabric.code && (
          <p className="text-dark-blue-70">
            {t("color")}:{" "}
            <span className="font-semibold text-dark-blue">
              {fabric.code}
              {fabric.color_name ? ` - ${fabric.color_name}` : ""}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================
// Main component
// =============================================

const ConfigurationSummary = ({ languageCode }: ConfigurationSummaryProps) => {
  const { state } = useConfigurator()
  const { t } = useTranslations("account")

  const backendLang = getBackendLanguageCode(languageCode as any)

  const {
    selectedFabric,
    selectedAdditionalComponents,
    additionalComponentGroups,
    sofaCombinations,
    productData,
  } = state

  const isSofa = productData?.advanced_product?.advanced_product_type === "SOFA"
  const hasFabricSelection = productData?.advanced_product?.advanced_product_type === "SOFA" || productData?.advanced_product?.advanced_product_type === "OTHER_WITH_FABRICS"

  // --- Determine fabric visibility ---
  const hasSingleFabric =
    selectedFabric.fabricGroupObject !== null &&
    selectedFabric.fabricObject !== null

  const combinationEntries = selectedFabric.combinationFabrics
    ? Object.entries(selectedFabric.combinationFabrics)
    : []
  const hasCombinationFabrics = combinationEntries.length > 0

  const hasFabrics = hasSingleFabric || hasCombinationFabrics

  // --- Filter components ---
  const visibleComponents = selectedAdditionalComponents.filter((comp) => {
    if (EXCLUDED_GROUP_CODES.includes(comp.groupCode)) return false
    if (comp.code === "0") return false
    return true
  })

  const hasComponents = visibleComponents.length > 0

  // Early return: nothing selected yet
  if (!hasFabrics && !hasComponents) return null

  // ==============================
  // Renderers
  // ==============================

  const renderFabrics = () => {
    if (!hasFabricSelection) return null
    if (!hasFabrics) return null

    return (
      <div>
        <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("fabric")}
        </h6>
        <div className="flex flex-row flex-wrap gap-3">
          {hasCombinationFabrics
            ? combinationEntries.map(([key, entry]) => {
                const groupName = getFabricGroupName(
                  entry.fabricGroupObject,
                  backendLang
                )
                const optionLabel =
                  combinationEntries.length > 1
                    ? getOptionName(entry.option, backendLang)
                    : undefined
                return (
                  <FabricCard
                    key={key}
                    fabric={entry.fabricObject}
                    groupName={groupName}
                    optionLabel={optionLabel}
                  />
                )
              })
            : hasSingleFabric && (
                <FabricCard
                  fabric={selectedFabric.fabricObject!}
                  groupName={getFabricGroupName(
                    selectedFabric.fabricGroupObject!,
                    backendLang
                  )}
                />
              )}
        </div>
      </div>
    )
  }

  const renderAdditionalComponents = () => {
    if (!hasComponents) return null

    return (
      <div className="mt-5">
        <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("type-label")}
        </h6>
        <div className="flex flex-row flex-wrap gap-3">
          {visibleComponents.map((comp, idx) => {
            const group = additionalComponentGroups.find(
              (g: ComponentGroup) => g.code === comp.groupCode
            )
            const compName = getComponentName(comp, backendLang)
            const groupName = group
              ? getGroupName(group, backendLang)
              : comp.groupCode

            return (
              <div
                key={`${comp.id}-${idx}`}
                className="flex bg-gold-20 rounded border border-gray-100 overflow-hidden"
              >
                {comp.image?.src ? (
                  <img
                    src={comp.image.src_md || comp.image.src}
                    alt={compName}
                    className="h-16 w-auto max-w-[6rem] flex-shrink-0 object-contain"
                  />
                ) : comp.color?.hex ? (
                  <span
                    className="w-16 h-16 flex-shrink-0"
                    style={{ backgroundColor: comp.color.hex }}
                  />
                ) : null}
                <div className="p-2 text-xs space-y-0.5 min-w-0 max-w-[360px]">
                  {groupName && (
                    <p className="text-dark-blue-70">{groupName}</p>
                  )}
                  <p className="font-semibold text-dark-blue">{compName}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderSofaSets = () => {
    if (!isSofa || !sofaCombinations || sofaCombinations.length === 0) return null

    return (
      <div className="space-y-3">
        {sofaCombinations.map((combination, index) => (
          <SofaSetCard
            key={index}
            combination={combination}
            setIndex={index}
            totalSets={sofaCombinations.length}
          />
        ))}
      </div>
    )
  }

  // ==============================
  // Layout
  // ==============================

  if (isSofa) {
    return (
      <div className="py-4">
        <div className="space-y-5">
          {renderFabrics()}
          {renderSofaSets()}
        </div>
        {renderAdditionalComponents()}
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="space-y-5">{renderFabrics()}</div>
      {renderAdditionalComponents()}
    </div>
  )
}

export default ConfigurationSummary
