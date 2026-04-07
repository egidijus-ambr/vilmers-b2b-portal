"use client"

import ResponsiveDialog from "@modules/common/components/responsive-dialog"
import type { FabricGroupDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { useFabricGroupDetails } from "../../hooks/use-fabric-group-details"
import { resolveProfile } from "../../utils/fabric-profile-helpers"
import {
  FabricTextFeaturesGrid,
  FabricCharacteristicsDisplay,
} from "../fabric-feature-display"

interface FabricImageModalProps {
  isOpen: boolean
  onClose: () => void
  fabricName: string
  imageSrc: string
  groupData: FabricGroupDetail
  languageCode: string
}

export default function FabricImageModal({
  isOpen,
  onClose,
  fabricName,
  imageSrc,
  groupData,
  languageCode,
}: FabricImageModalProps) {
  const { priceCategory, featuresWithPhoto, featureGroups } =
    useFabricGroupDetails(groupData, languageCode)

  const resolvedGroupName = (() => {
    const profile = resolveProfile(groupData.fabric_group_profiles, languageCode)
    return (profile as any)?.name ?? null
  })()

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
