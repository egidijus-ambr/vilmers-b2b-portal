"use client"

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Dialog, Transition } from "@headlessui/react"
import type { SofaFormExtended, SelectedFabricState } from "@configurator/lib/types"
import { getPriceFromPriceCategories, applyDiscount } from "@configurator/lib/price-utils"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import PriceDisplay from "@modules/common/components/price-display"
import { activeTheme } from "themes"
import {
  METRIC_SIZE,
  LABEL_GAP,
} from "@configurator/SofaDrawingElements/SofaElements/constants"

// Konva can't consume a Tailwind class — it needs a literal color string.
// Resolve the `configurator_card` surface token to its underlying hex from
// the active theme (build-time constant) so this can't drift from the
// `bg-configurator-card` token used elsewhere in this file.
const CONFIGURATOR_CARD_HEX =
  activeTheme.colors[activeTheme.surfaces.configurator_card] ??
  activeTheme.surfaces.configurator_card

// =============================================
// Types
// =============================================

type SofaModulesDrawerProps = {
  isOpen: boolean
  close: () => void
  sofaForms: SofaFormExtended[]
  onAddForm: (sofaForm: SofaFormExtended) => void
  languageCode: string
  armrestWidthOverride?: number
  armrestName?: string
  selectedFabric: SelectedFabricState
  currency?: string
  showAllProducts?: boolean
}

// =============================================
// Group ordering
// =============================================

const GROUPS_ORDER = [
  "Modules",
  "Corners and Openends",
  "Modules With Armrest",
  "Modules With Left Armrest",
  "Modules With Right Armrest",
  "Combinations",
  "Other modules",
]

function getModuleGroup(sofaForm: SofaFormExtended): string {
  return (
    (sofaForm.metadata as Record<string, any> | null)?.group ?? "Other modules"
  )
}

// =============================================
// Konva preview — client-side only
// =============================================

interface ModulePreviewProps {
  sofaForm: SofaFormExtended
  armrestWidthOverride?: number
}

/**
 * Inner component that uses react-konva directly.
 * Wrapped with dynamic({ ssr: false }) below so Konva never runs on the server.
 */
function ModulePreviewInner({ sofaForm, armrestWidthOverride }: ModulePreviewProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Stage, Layer } =
    require("react-konva") as typeof import("react-konva")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SofaElements =
    require("@configurator/SofaDrawingElements/SofaElements") as Record<
      string,
      React.ComponentType<any>
    >
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drawMetricLinesForGroups } =
    require("@configurator/SofaDrawingElements/utils") as {
      drawMetricLinesForGroups: (groupOfGroups: any[], layer: any, scale: number, params?: any, fontSize?: number, labelBackground?: string) => import("@configurator/SofaDrawingElements/utils").GroupMeasurement
    }

  const SofaElement = SofaElements[sofaForm.type]

  const dims = sofaForm.dimensions
  const scale = 0.65
  const metricSpace = 45 // space for dimension arrows (METRIC_SIZE=60 + small margin)

  const rawW = dims.width ?? 100
  const rawH = dims.length ?? dims.height ?? 100
  const extraH = dims.extendable_part_length ?? 0
  const armW = armrestWidthOverride ?? dims.armrest_width ?? 22

  // Right clearance mirrors the left (metricSpace + armW) so a right-side vertical
  // metric line/label (drawn when a composite module's right height differs from its
  // left, see drawMetricLinesForGroups) has the same clearance as the left one instead
  // of being clipped against the stage edge. But `armW + metricSpace` alone isn't
  // enough on its own: the label needs METRIC_SIZE / 2 + LABEL_GAP regardless of armW
  // (and armrestWidthOverride ?? dims.armrest_width ?? 22 does NOT fall back for an
  // explicit armrest_width of 0 — `??` only replaces null/undefined), so floor it.
  const rightClearance = Math.max(
    armW + metricSpace,
    METRIC_SIZE / 2 + LABEL_GAP + 5
  )
  const stageW = Math.round((rawW + (metricSpace + armW) + rightClearance) * scale)
  const stageH = Math.round((rawH + extraH + metricSpace + 10) * scale)

  const [layer, setLayer] = useState<any>(null)
  const layerRef = useCallback((node: any) => {
    if (node) setLayer(node)
  }, [])

  useEffect(() => {
    if (!layer) return
    const shapes = layer.find(".sofa_shape_group")
    if (shapes.length === 0) return
    layer.find(".metricLine").forEach((l: any) => l.destroy())
    drawMetricLinesForGroups(shapes, layer, scale, null, 18, CONFIGURATOR_CARD_HEX)
  }, [layer, sofaForm.id, armrestWidthOverride, scale])

  if (!SofaElement) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <span className="text-[10px] text-gray-400 font-mono">
          {sofaForm.type}
        </span>
      </div>
    )
  }

  return (
    <Stage
      width={stageW}
      height={stageH}
      scaleX={scale}
      scaleY={scale}
      listening={false}
      style={{ display: "block" }}
    >
      <Layer ref={layerRef}>
        <SofaElement
          id={sofaForm.id.toString()}
          x={metricSpace + armW}
          y={metricSpace}
          width={rawW}
          height={rawH}
          draggable={false}
          verticalMetric={false}
          horizontalMetric={false}
          showButtons={false}
          scale={scale}
          stageWidth={stageW}
          stageHeight={stageH}
          armrestWidth={dims.armrest_width}
          armrestWidthOverride={armrestWidthOverride}
          backrestWidth={dims.backrest_width}
          mattressWidth={dims.mattress_width}
          mattressLength={dims.mattress_length}
          enabled_connectors={sofaForm.enabled_connectors}
          cornerPartLength={dims.corner_part_length}
          cornerRadius={dims.corner_radius}
          composition={dims.composition}
          angle={dims.angle}
          seatHeight={dims.seat_height}
          extendablePartLength={dims.extendable_part_length}
          numberOfBigPillows={dims.number_of_big_pillows}
          numberOfSmallPillows={dims.number_of_small_pillows}
          spreadOfBigPillows={dims.spread_of_big_pillows}
          spreadOfSmallPillows={dims.spread_of_small_pillows}
          sizeOfBigPillow={dims.size_of_big_pillow}
          sizeOfPillow={dims.size_of_pillow}
          seatSections={dims.seat_sections}
          backrestSections={dims.backrest_sections}
          extensionType={dims.extension_type}
          backrestType={dims.backrest_type}
          coveredSide={dims.covered_side}
        />
      </Layer>
    </Stage>
  )
}

// Disable SSR — Konva requires browser DOM
const ModulePreview = dynamic<ModulePreviewProps>(
  () => Promise.resolve(ModulePreviewInner),
  { ssr: false }
)

// =============================================
// Module card
// =============================================

interface ModuleCardProps {
  sofaForm: SofaFormExtended
  onAdd: () => void
  armrestWidthOverride?: number
  selectedFabric: SelectedFabricState
  currency?: string
}

function ModuleCard({ sofaForm, onAdd, armrestWidthOverride, selectedFabric, currency }: ModuleCardProps) {
  const price = getPriceFromPriceCategories(selectedFabric, sofaForm.form_price_fabric_category)
  const { discountPct } = useCustomerDiscount()
  const dims = sofaForm.dimensions

  // Card width matches Konva stage width so preview fits perfectly.
  // Keep this formula in sync with `stageW`/`rightClearance` in ModulePreviewInner
  // above — they must stay equal, or this card's overflow-hidden clips (or
  // needlessly widens beyond) the stage it wraps.
  const rawW = dims.width ?? 100
  const originalArmW = dims.armrest_width ?? 22
  const armW = armrestWidthOverride ?? originalArmW
  const adjustedW = rawW + (armW - originalArmW)
  const scale = 0.65
  const metricSpace = 45
  const rightClearance = Math.max(
    armW + metricSpace,
    METRIC_SIZE / 2 + LABEL_GAP + 5
  )
  const cardWidth = Math.max(
    Math.round((adjustedW + (metricSpace + armW) + rightClearance) * scale),
    100
  )

  return (
    <div
      style={{ width: cardWidth }}
      className="flex flex-col overflow-hidden bg-configurator-card flex-shrink-0"
    >
      {/* Shape preview area — height adapts to module size */}
      <div className="flex-1 min-h-[60px] flex items-start overflow-hidden">
        <ModulePreview sofaForm={sofaForm} armrestWidthOverride={armrestWidthOverride} />
      </div>

      {/* Info + action — pinned to bottom so names align across row */}
      <div className="mt-auto px-2 pt-1.5 pb-2 flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">
          {sofaForm.name}
        </p>
        {price != null && price > 0 && (() => {
          const priced = applyDiscount(price, discountPct)
          return (
            <PriceDisplay
              regular={priced.regular}
              discounted={priced.hasDiscount ? priced.discounted : null}
              currencyCode={currency ?? "EUR"}
              size="sm"
            />
          )
        })()}
        <button
          onClick={onAdd}
          className="mt-1.5 w-full text-xs font-medium border border-configurator-accent text-configurator-accent hover:bg-configurator-accent hover:text-configurator-accent-foreground transition-colors py-1 px-2"
        >
          Add
        </button>
      </div>
    </div>
  )
}

// =============================================
// Main drawer
// =============================================

const SofaModulesDrawer = ({
  isOpen,
  close,
  sofaForms,
  onAddForm,
  armrestWidthOverride,
  armrestName,
  selectedFabric,
  currency,
  showAllProducts = false,
}: SofaModulesDrawerProps) => {
  const [searchValue, setSearchValue] = useState("")

  // Filter by search query against name or code, and by price availability
  const filteredForms = useMemo(() => {
    const query = searchValue.toLowerCase().trim()
    let forms = sofaForms

    // Filter by search
    if (query) {
      forms = forms.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          (f.code?.toLowerCase().includes(query) ?? false)
      )
    }

    // Filter out modules without a price for the selected fabric
    if (selectedFabric.fabricGroupObject && !showAllProducts) {
      forms = forms.filter((f) => {
        const price = getPriceFromPriceCategories(selectedFabric, f.form_price_fabric_category)
        return price != null && price > 0
      })
    }

    return forms
  }, [sofaForms, searchValue, selectedFabric, showAllProducts])

  // Group and sort modules
  const moduleGroups = useMemo(() => {
    const grouped: Record<string, SofaFormExtended[]> = {}

    for (const form of filteredForms) {
      const group = getModuleGroup(form)
      if (!grouped[group]) grouped[group] = []
      grouped[group].push(form)
    }

    return Object.entries(grouped)
      .map(([group, items]) => ({
        group,
        items: [...items].sort((a, b) => {
          const wDiff = (a.dimensions.width ?? 0) - (b.dimensions.width ?? 0)
          if (wDiff !== 0) return wDiff
          const lDiff =
            (a.dimensions.length ?? a.dimensions.height ?? 0) -
            (b.dimensions.length ?? b.dimensions.height ?? 0)
          if (lDiff !== 0) return lDiff
          if (a.code && b.code)
            return a.code.localeCompare(b.code, undefined, { numeric: true })
          return a.type.localeCompare(b.type)
        }),
      }))
      .sort(
        (a, b) => GROUPS_ORDER.indexOf(a.group) - GROUPS_ORDER.indexOf(b.group)
      )
  }, [filteredForms])

  // Only show group headers when there are multiple groups or the single group is not the default
  const showGroupHeaders =
    moduleGroups.length > 1 ||
    (moduleGroups.length === 1 && moduleGroups[0].group !== "Other modules")

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Drawer panel — slides from right */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-[700px] bg-configurator-surface shadow-xl flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Dialog.Title className="text-lg font-semibold">
                      Sofa Modules
                    </Dialog.Title>
                    <button
                      onClick={close}
                      className="p-1 hover:bg-gray-100 transition-colors"
                      aria-label="Close drawer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="px-6 py-3 border-b">
                    <input
                      type="search"
                      placeholder="Search modules..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-configurator-accent focus:border-configurator-accent"
                    />
                  </div>

                  {armrestName && (
                    <div className="px-6 py-2 text-xs text-gray-500 border-b">
                      Sizes shown with armrest: <span className="font-medium text-gray-700">{armrestName}</span>
                    </div>
                  )}

                  {/* Scrollable module list */}
                  <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {moduleGroups.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        No modules match your search
                      </p>
                    ) : (
                      moduleGroups.map(({ group, items }) => (
                        <div key={group}>
                          {showGroupHeaders && (
                            <div className="flex items-center justify-between pt-4 pb-2 border-b border-gold mb-3">
                              <span className="text-sm font-semibold text-gray-700">
                                {group}
                              </span>
                              <span className="text-xs text-gray-400">
                                {items.length}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-stretch gap-3 mb-2">
                            {items.map((sofaForm) => (
                              <ModuleCard
                                key={sofaForm.id}
                                sofaForm={sofaForm}
                                onAdd={() => onAddForm(sofaForm)}
                                armrestWidthOverride={armrestWidthOverride}
                                selectedFabric={selectedFabric}
                                currency={currency}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default SofaModulesDrawer
