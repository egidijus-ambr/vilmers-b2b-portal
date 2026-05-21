"use client"

import { useConfigurator } from "@configurator/context/configurator-context"
import { getComponentName } from "@configurator/lib/component-utils"
import { useTranslations } from "@lib/i18n"

const DIMENSION_KEY_MAP = [
  { dataKey: "width", translationKey: "width" },
  { dataKey: "height", translationKey: "height" },
  { dataKey: "length", translationKey: "length" },
  { dataKey: "seat_height", translationKey: "seat-height" },
  { dataKey: "seat_width", translationKey: "seat-width" },
  { dataKey: "seat_depth", translationKey: "seat-depth" },
  { dataKey: "leg_height", translationKey: "leg-height" },
  { dataKey: "headboard_height", translationKey: "headboard-height" },
  { dataKey: "headboard_width", translationKey: "headboard-width" },
  { dataKey: "mattress_width", translationKey: "mattress-width" },
  { dataKey: "mattress_length", translationKey: "mattress-length" },
  { dataKey: "table_extended_lengh", translationKey: "table-extended-length" },
  { dataKey: "table_top_thickness", translationKey: "table-top-thickness" },
  { dataKey: "table_leg_width", translationKey: "table-leg-width" },
  { dataKey: "shade_height", translationKey: "shade-height" },
  { dataKey: "shade_radius", translationKey: "shade-radius" },
]

interface ProductPreviewSectionProps {
  languageCode: string
}

export default function ProductPreviewSection({ languageCode }: ProductPreviewSectionProps) {
  const { state } = useConfigurator()
  const { t } = useTranslations("account")

  const modelComponent = state.selectedAdditionalComponents.find(
    (c) => c.groupCode.startsWith("model")
  )

  if (!modelComponent) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-400 text-sm">Product preview</p>
      </div>
    )
  }

  const imageSrc = modelComponent.image?.src_md ?? modelComponent.image?.src_xs ?? modelComponent.image?.src
  const componentName = getComponentName(modelComponent, languageCode)
  const dimensions = modelComponent.dimensions

  const dimensionRows = DIMENSION_KEY_MAP
    .map(({ dataKey, translationKey }) => ({
      label: t(translationKey),
      value: dimensions?.[dataKey] as number | undefined,
    }))
    .filter((row): row is { label: string; value: number } => row.value != null && row.value > 0)

  return (
    <div className="p-6 min-h-[400px] flex items-center">
      <div className="flex flex-col sm:flex-row gap-6 w-full">
        {/* Left: Image */}
        <div className="flex-1 bg-white flex flex-col items-center justify-center gap-3">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={componentName}
              className="max-h-[350px] w-auto object-contain"
            />
          ) : (
            <p className="text-gray-400 text-sm">{componentName}</p>
          )}
        </div>

        {/* Right: Dimensions */}
        {dimensionRows.length > 0 && (
          <div className="w-48 flex flex-col justify-start">
            <h6 className="text-xs font-semibold text-dark-blue-70 uppercase tracking-wide mb-3">
              {t("dimensions")}
            </h6>
            <div className="space-y-1 text-xs">
              {dimensionRows.map((row) => (
                <div key={row.label} className="flex items-baseline gap-2">
                  <span className="text-dark-blue-70 whitespace-nowrap">{row.label}</span>
                  <span className="flex-1 border-b border-dashed border-gray-300" />
                  <span className="text-dark-blue font-medium whitespace-nowrap">
                    {Math.round(row.value)} cm
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
