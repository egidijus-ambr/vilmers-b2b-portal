"use client"

import React, { useState } from "react"
import { ProductItemRow } from "./types"
import SofaConfigurationDetail from "@modules/common/components/sofa-configuration"
import { InlineReferenceEdit } from "./inline-reference-edit"

interface MobileCardProps {
  item: ProductItemRow
  index: number
  formatPrice: (price: number) => string
  translations: {
    noImage: string
    customerReference: string
    quantity: string
    showConfiguration: string
    hideConfiguration: string
  }
  renderActions?: (item: ProductItemRow) => React.ReactNode
  onReferenceChange?: (itemId: string, newReference: string) => Promise<void>
}

const excludedCodes = ["shooting", "threads-type", "market", "direction"]

export const MobileCard: React.FC<MobileCardProps> = ({
  item,
  index,
  formatPrice,
  translations: t,
  renderActions,
  onReferenceChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleComponents =
    item.orderDetailItem?.cart_item?.additional_components?.filter(
      (c: any) => {
        const groupCode = c.additional_component_group?.code
        return !(groupCode && excludedCodes.includes(groupCode))
      }
    ) || []

  return (
    <React.Fragment>
      {index > 0 && <div className="border-t border-gray-100" />}
      <div className="flex gap-4 py-4">
        <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-100 overflow-hidden">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              width={100}
              height={100}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              {t.noImage}
            </div>
          )}
        </div>
        <div className="flex flex-col text-sm min-w-0">
          <p className="text-dark-blue font-medium">{item.name}</p>
          {item.reference && onReferenceChange ? (
            <InlineReferenceEdit
              reference={item.reference}
              label={t.customerReference}
              onSave={(newRef) => onReferenceChange(item.id, newRef)}
            />
          ) : item.reference ? (
            <p className="text-dark-blue-70 text-xs mt-0.5">
              {t.customerReference}: {item.reference}
            </p>
          ) : null}
          <p className="text-dark-blue-70 mt-1">
            {t.quantity}: {item.quantity}
          </p>
          <p className="text-dark-blue font-medium mt-1">
            {formatPrice(item.total)}
          </p>
          {!item.isAdvanced && visibleComponents.length > 0 && (
            <div className="mt-2 space-y-1">
              {visibleComponents.map((comp: any) => {
                const groupProfile =
                  comp.additional_component_group
                    ?.additional_component_group_profiles?.[0]
                const compProfile = comp.additional_component_profiles?.[0]
                return (
                  <div
                    key={comp.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {comp.image?.src_thumbnail ? (
                      <img
                        src={comp.image.src_thumbnail}
                        alt={compProfile?.name || ""}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                      />
                    ) : comp.color?.hex ? (
                      <span
                        className="w-6 h-6 rounded flex-shrink-0 border border-gray-200"
                        style={{ backgroundColor: comp.color.hex }}
                      />
                    ) : null}
                    <span className="text-dark-blue-70">
                      {groupProfile?.name ? `${groupProfile.name}: ` : ""}
                      <span className="text-dark-blue font-medium">
                        {compProfile?.name || "-"}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          {item.isAdvanced && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs text-dark-blue-70 hover:text-dark-blue underline underline-offset-2 transition-colors self-start"
            >
              {isExpanded ? t.hideConfiguration : t.showConfiguration}
            </button>
          )}
          {renderActions && (
            <div className="mt-2">{renderActions(item)}</div>
          )}
        </div>
      </div>
      {item.isAdvanced && isExpanded && item.orderDetailItem && (
        <SofaConfigurationDetail item={item.orderDetailItem} />
      )}
    </React.Fragment>
  )
}
