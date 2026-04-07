"use client"

import type { FabricFeatureDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import type { FeatureGroupEntry } from "../../hooks/use-fabric-group-details"
import { resolveFeatureName } from "../../utils/fabric-profile-helpers"
import { clx } from "@medusajs/ui"

interface FabricTextFeaturesGridProps {
  featureGroups: FeatureGroupEntry[]
  languageCode: string
  className?: string
}

export function FabricTextFeaturesGrid({
  featureGroups,
  languageCode,
  className,
}: FabricTextFeaturesGridProps) {
  if (featureGroups.length === 0) return null

  return (
    <div className={clx("grid grid-cols-2 gap-x-8 gap-y-5", className)}>
      {featureGroups.map((group) =>
        group.features.map((feature) => (
          <div key={feature.id} className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-dark-blue tracking-wide uppercase">
              {group.groupName}
            </span>
            <span className="text-sm text-dark-blue">
              {resolveFeatureName(feature, languageCode)}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

interface FabricCharacteristicsDisplayProps {
  features: FabricFeatureDetail[]
  languageCode: string
  showHeading?: boolean
  className?: string
}

export function FabricCharacteristicsDisplay({
  features,
  languageCode,
  showHeading = false,
  className,
}: FabricCharacteristicsDisplayProps) {
  if (features.length === 0) return null

  return (
    <div className={className}>
      {showHeading && (
        <h3 className="text-xs font-semibold text-dark-blue tracking-[0.2em] uppercase mb-4">
          Characteristics
        </h3>
      )}
      <div className="flex flex-wrap gap-4">
        {features.map((feature) => {
          const photo = (feature as any)?.photo
          const name = resolveFeatureName(feature, languageCode)
          return (
            <div
              key={feature.id}
              className="flex flex-col items-center gap-1.5"
              title={name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo?.src ?? photo}
                alt={name}
                className="w-10 h-10 object-contain"
              />
              <span className="text-xs text-dark-blue-70 text-center max-w-[60px] leading-tight">
                {name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
