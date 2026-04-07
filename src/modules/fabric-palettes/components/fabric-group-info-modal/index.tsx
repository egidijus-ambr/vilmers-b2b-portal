"use client"

import ResponsiveDialog from "@modules/common/components/responsive-dialog"
import type { FabricGroupDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { useFabricGroupDetails } from "../../hooks/use-fabric-group-details"
import {
  FabricTextFeaturesGrid,
  FabricCharacteristicsDisplay,
} from "../fabric-feature-display"

interface FabricGroupInfoModalProps {
  isOpen: boolean
  onClose: () => void
  groupName: string
  groupData: FabricGroupDetail
  languageCode: string
}

export default function FabricGroupInfoModal({
  isOpen,
  onClose,
  groupName,
  groupData,
  languageCode,
}: FabricGroupInfoModalProps) {
  const { priceCategory, description, featuresWithPhoto, featureGroups } =
    useFabricGroupDetails(groupData, languageCode)

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={groupName}
      size="medium"
      data-testid="fabric-group-info-modal"
    >
      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-8 py-6 bg-gold-10 space-y-6">
        {/* Price category */}
        {priceCategory && (
          <p className="text-sm text-gold tracking-wider uppercase">
            {priceCategory}
          </p>
        )}

        {/* Optional description */}
        {description && (
          <p className="text-sm text-dark-blue-70 leading-relaxed">
            {description}
          </p>
        )}

        {/* Text feature grid — grouped by feature group */}
        <FabricTextFeaturesGrid
          featureGroups={featureGroups}
          languageCode={languageCode}
          className="xsmall:grid-cols-3"
        />

        {/* Characteristics — features with a photo icon */}
        <FabricCharacteristicsDisplay
          features={featuresWithPhoto}
          languageCode={languageCode}
          showHeading
        />

        {/* Empty state */}
        {featureGroups.length === 0 && featuresWithPhoto.length === 0 && (
          <p className="text-sm text-dark-blue-70 italic">
            No feature information available.
          </p>
        )}
      </div>
    </ResponsiveDialog>
  )
}
