"use client"

import React, { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  OrderDetailItem,
  CartItemFabricDetail,
  AdditionalComponentDetail,
  AdvancedProductDimensions,
} from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations, getBackendLanguageCode } from "@lib/i18n"
import { isValidMeasurement, SetMeasurement } from "@configurator/lib/types"

// Dynamically import Konva-based preview (requires browser DOM, no SSR)
const SofaDrawingPreview = dynamic(
  () =>
    import("../../../../configurator/SofaDrawingElements/SofaDrawingPreview"),
  { ssr: false }
)

// --- Types ---

interface SofaConfigurationDetailProps {
  item: OrderDetailItem
}

interface ParsedSofaDimensions {
  width: number
  length: number
  height: number
  armrestWidth: number
}

interface ParsedSofaSet {
  setIndex: number
  parts: {
    moduleName: string
    moduleCode: string
    shapeType: string
    price: number
  }[]
  dimensions: ParsedSofaDimensions | null
}

interface KonvaShape {
  attrs: {
    type?: string
    x?: number
    y?: number
    width?: number
    height?: number
    originalWidth?: number
    originalHeight?: number
    rotation?: number
    originalSofaForm?: {
      code?: string
      enabled_connectors?: string[]
      dimensions?: {
        width?: number
        height?: number
        length?: number
        armrest_width?: number
        backrest_width?: number
        mattress_width?: number
        mattress_length?: number
        corner_part_length?: number
        corner_radius?: number
        composition?: string
        seat_height?: number
        angle?: number
        extendable_part_length?: number
        number_of_big_pillows?: number
        number_of_small_pillows?: number
        spread_of_big_pillows?: number
        spread_of_small_pillows?: number
        size_of_big_pillow?: number
        size_of_pillow?: number
        seat_sections?: number
        backrest_sections?: number
        extension_type?: string
        backrest_type?: string
        covered_side?: boolean
      }
    }
    new_armrest_width?: number
    // Rotation-aware width/depth persisted by the configurator's
    // handleAddToCart (see isValidMeasurement) — the source of truth when
    // present. Absent on legacy cart/order items created before this was
    // added, and possibly malformed since this whole object is round-
    // tripped through JSON.stringify/JSON.parse — treat as untrusted.
    measured?: {
      width?: number
      depth?: number
    } | null
  }
}

// --- Parse sofa combinations JSON ---

function parseShapeItem(item: any): KonvaShape | null {
  try {
    const obj = typeof item === "string" ? JSON.parse(item) : item
    if (obj?.attrs && typeof obj.attrs === "object") return obj as KonvaShape
    return null
  } catch {
    return null
  }
}

function parseSofaCombinations(json: string): KonvaShape[][] {
  try {
    const data = JSON.parse(json)
    if (!Array.isArray(data)) return []
    return data
      .filter(Array.isArray)
      .map((combo: any[]) =>
        combo.map(parseShapeItem).filter((s): s is KonvaShape => s !== null)
      )
  } catch {
    return []
  }
}

// Reads the rotation-aware width/depth persisted by the configurator's
// handleAddToCart (attrs.measured — see isValidMeasurement) from the first
// node in a set that carries a trustworthy one. This is the source of
// truth when present, since it comes from the rendered drawing geometry
// (measureGroupOfGroups) rather than a naive per-module dimension sum.
// Returns null for legacy items created before attrs.measured existed, or
// if the value doesn't survive the JSON round-trip as a plain, finite,
// positive-on-both-axes object (this data is untrusted — round-tripped
// through JSON.stringify/JSON.parse from a stored cart/order item).
function readMeasuredFromSet(nodes: KonvaShape[]): SetMeasurement | null {
  for (const node of nodes) {
    const measured = node?.attrs?.measured
    if (
      measured &&
      typeof measured === "object" &&
      Number.isFinite(measured.width) &&
      Number.isFinite(measured.depth) &&
      isValidMeasurement(measured as SetMeasurement)
    ) {
      return { width: measured.width as number, depth: measured.depth as number }
    }
  }
  return null
}

// --- Parse sofa sets from metadata ---

function parseSofaSets(item: OrderDetailItem): ParsedSofaSet[] {
  const configurations = item.metadata?.configurations
  if (!Array.isArray(configurations)) return []

  const combinations = item.cart_item?.selected_sofa_combinations
    ? parseSofaCombinations(item.cart_item.selected_sofa_combinations)
    : []

  // Build dimension lookup from combinations
  const konvaDimensions: Record<string, any> = {}
  for (const combo of combinations) {
    for (const shape of combo) {
      const code = shape?.attrs?.originalSofaForm?.code
      const dims = shape?.attrs?.originalSofaForm?.dimensions
      if (code && dims) {
        konvaDimensions[code] = {
          width: dims.width || 0,
          height: dims.height || 0,
          length: dims.length || 0,
          armrest_width: dims.armrest_width || 0,
        }
      }
    }
  }

  return configurations.map((setParts: any[], setIndex: number) => {
    const parts = (setParts || []).map((part: any) => ({
      moduleName: part.moduleName || "",
      moduleCode: part.moduleCode || "",
      shapeType: part.shapeType || "",
      price: part.price || 0,
    }))

    // combinations is parallel to configurations (both derive from the
    // same cart item, indexed the same way elsewhere in this file — see
    // `combinations[idx]` next to `sofaSets.map` in the render section).
    const measuredForSet = readMeasuredFromSet(combinations[setIndex] || [])

    let dimensions: ParsedSofaDimensions | null = null
    const konvaPartDims = parts
      .map((p) => konvaDimensions[p.moduleCode])
      .filter(Boolean)

    if (konvaPartDims.length > 0 || measuredForSet) {
      const naiveWidth = konvaPartDims.reduce(
        (sum: number, d: any) => sum + (d.width || 0),
        0
      )
      const naiveLength =
        konvaPartDims.length > 0
          ? Math.max(...konvaPartDims.map((d: any) => d.length || 0))
          : 0

      dimensions = {
        // Prefer the persisted rotation-aware measurement; fall back to
        // the naive per-module sum for legacy items without it. Height
        // and armrest width aren't affected by rotation the same way, so
        // they keep using the naive per-module value either way.
        width: measuredForSet ? measuredForSet.width : naiveWidth,
        length: measuredForSet ? measuredForSet.depth : naiveLength,
        height: konvaPartDims[0]?.height || 0,
        armrestWidth: konvaPartDims[0]?.armrest_width || 0,
      }
    }

    return { setIndex, parts, dimensions }
  })
}

// --- Sofa set canvas wrapper ---

interface SofaSetPreviewProps {
  shapes: KonvaShape[]
  maxHeight?: number
}

const SofaSetPreview: React.FC<SofaSetPreviewProps> = ({
  shapes,
  maxHeight = 250,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [combination, setCombination] = useState<any[]>([])

  // Rehydrate static JSON data into live Konva nodes (same pattern as frontend shop)
  useEffect(() => {
    if (shapes.length === 0) return
    import("konva").then(({ default: Konva }) => {
      const rehydrated = shapes.map((item: any) => {
        const newGroup = new Konva.Group(item)
        if (item.children) {
          for (const child of item.children) {
            const newChild = new (Konva as any)[child.className](child)
            newGroup.add(newChild)
          }
        }
        return newGroup
      })
      setCombination(rehydrated)
    })
  }, [shapes])

  if (combination.length === 0) return null

  return (
    <div
      ref={containerRef}
      style={{
        height: maxHeight,
        width: "100%",
        position: "relative",
      }}
    >
      <SofaDrawingPreview
        combination={combination}
        parentRef={containerRef}
        sofaScale={1}
      />
    </div>
  )
}

// --- Main component ---

const SofaConfigurationDetail: React.FC<SofaConfigurationDetailProps> = ({
  item,
}) => {
  const { t, language } = useTranslations("account")

  const isSofa = item.cart_item?.advanced_product_type === "SOFA"
  const hasConfigurations =
    item.metadata?.configurations &&
    Array.isArray(item.metadata.configurations) &&
    item.metadata.configurations.length > 0

  const cartItemFabrics = item.cart_item?.cartItemFabrics || []
  const additionalComponents = item.cart_item?.additional_components || []
  const hasFabrics = cartItemFabrics.length > 0
  const hasComponents = additionalComponents.length > 0

  if (!hasFabrics && !hasComponents && !hasConfigurations) return null

  const sofaSets = isSofa && hasConfigurations ? parseSofaSets(item) : []
  const combinations =
    isSofa && item.cart_item?.selected_sofa_combinations
      ? parseSofaCombinations(item.cart_item.selected_sofa_combinations)
      : []

  const backendLang = getBackendLanguageCode(language as any)

  const excludedCodes = ["shooting", "threads-type", "market", "direction"]
  const visibleComponents = additionalComponents.filter((c) => {
    const groupCode = c.additional_component_group?.code
    return !(groupCode && excludedCodes.includes(groupCode))
  })

  const getCompName = (comp: AdditionalComponentDetail): string => {
    const profile = comp.additional_component_profiles?.find(
      (p) => p.language.toLowerCase() === backendLang.toLowerCase()
    )
    return profile?.name || comp.additional_component_profiles?.[0]?.name || "-"
  }

  const getGroupName = (comp: AdditionalComponentDetail): string => {
    const profile =
      comp.additional_component_group?.additional_component_group_profiles?.find(
        (p) => p.language.toLowerCase() === backendLang.toLowerCase()
      )
    return (
      profile?.name ||
      comp.additional_component_group?.additional_component_group_profiles?.[0]
        ?.name ||
      ""
    )
  }

  const renderFabrics = () => {
    if (cartItemFabrics.length > 0) {
      return (
        <div>
          <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
            {t("fabric")}
          </h6>
          <div className="flex flex-row flex-wrap gap-3">
            {cartItemFabrics.map((cif: CartItemFabricDetail) => {
              const fabricGroupProfile =
                cif.fabric_group?.fabric_group_profiles?.find(
                  (p) => p.language.toLowerCase() === backendLang.toLowerCase()
                ) || cif.fabric_group?.fabric_group_profiles?.[0]
              const optionProfile =
                cif.combination_option?.fabricCombinationOptionProfiles?.find(
                  (p) => p.language.toLowerCase() === backendLang.toLowerCase()
                ) ||
                cif.combination_option?.fabricCombinationOptionProfiles?.[0]

              return (
                <div
                  key={cif.id}
                  className="flex bg-white rounded border border-gray-100 overflow-hidden"
                >
                  {cif.fabric?.image?.src_thumbnail && (
                    <img
                      src={cif.fabric.image.src_thumbnail}
                      alt={cif.fabric.code || ""}
                      className="w-28 h-28 object-cover flex-shrink-0"
                    />
                  )}
                  <div className="p-2 text-xs space-y-0.5 min-w-0">
                    {cartItemFabrics.length > 1 && (
                      <p className="font-medium text-dark-blue">
                        {t("fabric")}
                        {optionProfile?.name ? `: ${optionProfile.name}` : ""}
                      </p>
                    )}
                    {fabricGroupProfile?.name && (
                      <p className="text-dark-blue-70">
                        {t("group")}:{" "}
                        <span className="font-semibold text-dark-blue">
                          {fabricGroupProfile.name}
                        </span>
                      </p>
                    )}
                    {cif.fabric?.code && (
                      <p className="text-dark-blue-70">
                        {t("color")}:{" "}
                        <span className="font-semibold text-dark-blue">
                          {cif.fabric.code}
                          {cif.fabric.color_name
                            ? ` - ${cif.fabric.color_name}`
                            : ""}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (item.cart_item?.fabric_code || item.cart_item?.fabric_group_name) {
      return (
        <div>
          <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
            {t("fabric")}
          </h6>
          <div className="bg-white text-xs space-y-0.5">
            {item.cart_item.fabric_group_name && (
              <p className="text-dark-blue-70">
                {t("group")}: {item.cart_item.fabric_group_name}
              </p>
            )}
            {item.cart_item.fabric_code && (
              <p className="text-dark-blue-70">
                {t("color")}: {item.cart_item.fabric_code}
              </p>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  const renderAdditionalComponents = () => {
    if (visibleComponents.length === 0) return null

    return (
      <div className="mt-5">
        <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("type-label")}
        </h6>
        <div className="flex flex-row flex-wrap gap-3">
          {visibleComponents.flatMap((comp) => {
            const includedLinks = (comp.linked_components_source ?? []).filter(
              (link) => link.link_type === "INCLUDES"
            )
            const isWrapper = !!comp.is_wrapper && includedLinks.length > 0

            if (isWrapper) {
              const groupName = getGroupName(comp)
              const sortedLinks = [...includedLinks].sort(
                (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
              )
              return sortedLinks.map((link) => {
                const subProfile =
                  link.target_component.additional_component_profiles.find(
                    (p) =>
                      p.language.toLowerCase() === backendLang.toLowerCase()
                  ) ?? link.target_component.additional_component_profiles[0]
                const subName =
                  subProfile?.name ??
                  link.target_component.code ??
                  `Component ${link.target_component.id}`
                const imgSrc =
                  link.target_component.image?.src_thumbnail ??
                  link.target_component.image?.src ??
                  undefined

                return (
                  <div
                    key={`${comp.id}-${link.target_component.id}`}
                    className="flex bg-white rounded border border-gray-100 overflow-hidden"
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={subName}
                        className="h-16 w-auto max-w-[6rem] small:max-w-none flex-shrink-0 object-contain"
                      />
                    ) : null}
                    <div className="p-2 text-xs space-y-0.5 min-w-0 max-w-[360px]">
                      {groupName && (
                        <p className="text-dark-blue-70">{groupName}</p>
                      )}
                      <p className="font-semibold text-dark-blue">{subName}</p>
                    </div>
                  </div>
                )
              })
            }

            const groupName = getGroupName(comp)
            const compName = getCompName(comp)
            return [
              <div
                key={comp.id}
                className="flex bg-white rounded border border-gray-100 overflow-hidden"
              >
                {comp.image?.src ? (
                  <img
                    src={comp.image.src_thumbnail || comp.image.src}
                    alt={compName}
                    className="h-16 w-auto max-w-[6rem] small:max-w-none flex-shrink-0 object-contain"
                  />
                ) : comp.color?.hex ? (
                  <span
                    className="w-16 h-16 flex-shrink-0"
                    style={{
                      backgroundColor: comp.color.hex,
                    }}
                  />
                ) : null}
                <div className="p-2 text-xs space-y-0.5 min-w-0 max-w-[360px]">
                  {groupName && (
                    <p className="text-dark-blue-70">{groupName}</p>
                  )}
                  <p className="font-semibold text-dark-blue">{compName}</p>
                </div>
              </div>,
            ]
          })}
        </div>
      </div>
    )
  }

  const renderProductDimensions = () => {
    // Dimensions are stored on the "model" / "model-other" additional component
    const modelComponent = additionalComponents.find(
      (c) =>
        c.dimensions && c.additional_component_group?.code?.startsWith("model")
    )
    const dims = modelComponent?.dimensions
    if (!dims) return null

    const dimensionEntries: {
      label: string
      value: number | null | undefined
      unit: string
    }[] = [
      { label: t("width"), value: dims.width, unit: "cm" },
      { label: t("height"), value: dims.height, unit: "cm" },
      { label: t("length"), value: dims.length, unit: "cm" },
    ]

    const visible = dimensionEntries.filter(
      (d) => d.value != null && d.value > 0
    )
    if (visible.length === 0) return null

    return (
      <div className="max-w-[50%]">
        <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
          {t("dimensions")}
        </h6>
        <div className="space-y-1 text-xs">
          {visible.map((d) => (
            <div key={d.label} className="flex items-baseline gap-2">
              <span className="text-dark-blue-70 whitespace-nowrap">
                {d.label}
              </span>
              <span className="flex-1 border-b border-dashed border-gray-300" />
              <span className="text-dark-blue font-medium whitespace-nowrap">
                {d.value} {d.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Non-SOFA items: single-column layout with fabrics, dimensions + additional components
  if (!isSofa || !hasConfigurations) {
    return (
      <div className="px-4 py-4">
        <div className="space-y-5">
          {renderFabrics()}
          {renderProductDimensions()}
        </div>
        {renderAdditionalComponents()}
      </div>
    )
  }

  // SOFA items with configurations: full layout with Konva preview
  return (
    <div className="px-4 py-4">
      {sofaSets.map((sofaSet, idx) => {
        const comboShapes = combinations[idx] || []

        return (
          <div
            key={idx}
            className={`${idx > 0 ? "mt-6 pt-6 border-t border-gray-200" : ""}`}
          >
            {sofaSets.length > 1 && (
              <h5 className="text-sm font-medium text-dark-blue mb-3">
                {t("sofa-set")} {idx + 1}
              </h5>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-5">
                {renderFabrics()}

                <div className="grid grid-cols-1 small:grid-cols-2 gap-6">
                  {sofaSet.dimensions && (
                    <div>
                      <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
                        {t("dimensions")}
                      </h6>
                      <div className="space-y-1 text-xs">
                        {sofaSet.dimensions.width > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-dark-blue-70 whitespace-nowrap">
                              {t("width")}
                            </span>
                            <span className="flex-1 border-b border-dashed border-gray-300" />
                            <span className="text-dark-blue font-medium whitespace-nowrap">
                              {Math.round(sofaSet.dimensions.width)} cm
                            </span>
                          </div>
                        )}
                        {sofaSet.dimensions.length > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-dark-blue-70 whitespace-nowrap">
                              {t("length")}
                            </span>
                            <span className="flex-1 border-b border-dashed border-gray-300" />
                            <span className="text-dark-blue font-medium whitespace-nowrap">
                              {Math.round(sofaSet.dimensions.length)} cm
                            </span>
                          </div>
                        )}
                        {sofaSet.dimensions.height > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-dark-blue-70 whitespace-nowrap">
                              {t("height")}
                            </span>
                            <span className="flex-1 border-b border-dashed border-gray-300" />
                            <span className="text-dark-blue font-medium whitespace-nowrap">
                              {sofaSet.dimensions.height} cm
                            </span>
                          </div>
                        )}
                        {sofaSet.dimensions.armrestWidth > 0 && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-dark-blue-70 whitespace-nowrap">
                              {t("armrest-width")}
                            </span>
                            <span className="flex-1 border-b border-dashed border-gray-300" />
                            <span className="text-dark-blue font-medium whitespace-nowrap">
                              {sofaSet.dimensions.armrestWidth} cm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {sofaSet.parts.length > 0 && (
                    <div>
                      <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-2">
                        {t("parts")}
                      </h6>
                      <ul className="text-xs text-dark-blue space-y-1">
                        {sofaSet.parts.map((part, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-dark-blue-70 flex-shrink-0" />
                            {part.moduleName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: Konva rendering of shapes */}
              <div className="flex items-start justify-center">
                <div className="bg-white w-full">
                  {comboShapes.length > 0 ? (
                    <SofaSetPreview shapes={comboShapes} />
                  ) : (
                    <div className="max-w-[300px] w-full h-[150px] flex items-center justify-center text-gray-400 text-xs">
                      {t("no-image")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {renderAdditionalComponents()}
          </div>
        )
      })}
    </div>
  )
}

export default SofaConfigurationDetail
