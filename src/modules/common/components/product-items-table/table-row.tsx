"use client"

import React, { useState } from "react"
import { ProductItemRow } from "./types"
import SofaConfigurationDetail from "@modules/common/components/sofa-configuration"

interface TableRowProps {
  item: ProductItemRow
  index: number
  showVolume: boolean
  formatPrice: (price: number) => string
  translations: {
    noImage: string
    customerReference: string
    showConfiguration: string
    hideConfiguration: string
  }
  renderActions?: (item: ProductItemRow) => React.ReactNode
}

const excludedCodes = ["shooting", "threads-type", "market", "direction"]

export const TableRow: React.FC<TableRowProps> = ({
  item,
  index,
  showVolume,
  formatPrice,
  translations: t,
  renderActions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const colCount = 4 + (showVolume ? 1 : 0) + (renderActions ? 1 : 0)

  const visibleComponents =
    item.orderDetailItem?.cart_item?.additional_components?.filter(
      (c: any) => {
        const groupCode = c.additional_component_group?.code
        return !(groupCode && excludedCodes.includes(groupCode))
      }
    ) || []

  return (
    <React.Fragment>
      {index > 0 && (
        <tr>
          <td colSpan={colCount} className="px-4 py-0">
            <div className="border-t border-gray-200" />
          </td>
        </tr>
      )}
      <tr className="align-top">
        <td className="px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-[150px] h-[150px] flex-shrink-0 bg-gray-100 overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  width={150}
                  height={150}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  {t.noImage}
                </div>
              )}
            </div>
            <div>
              <p className="text-dark-blue font-medium">{item.name}</p>
              {item.reference && (
                <p className="text-dark-blue-70 text-xs mt-0.5">
                  {t.customerReference}: {item.reference}
                </p>
              )}
              {!item.isAdvanced && visibleComponents.length > 0 && (
                <div className="mt-2 space-y-1">
                  {visibleComponents.map((comp: any) => {
                    const groupProfile =
                      comp.additional_component_group
                        ?.additional_component_group_profiles?.[0]
                    const compProfile =
                      comp.additional_component_profiles?.[0]
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
                  className="mt-2 text-xs text-dark-blue-70 hover:text-dark-blue underline underline-offset-2 transition-colors"
                >
                  {isExpanded ? t.hideConfiguration : t.showConfiguration}
                </button>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-gray-900">{formatPrice(item.unitPrice)}</td>
        <td className="px-4 py-4 text-gray-900">{item.quantity}</td>
        {showVolume && (
          <td className="px-4 py-4 text-gray-900">
            {item.volume != null ? `${item.volume.toFixed(2)} m³` : "-"}
          </td>
        )}
        <td className="px-4 py-4 text-right text-gray-900 font-medium">
          {formatPrice(item.total)}
        </td>
        {renderActions && (
          <td className="px-4 py-4">{renderActions(item)}</td>
        )}
      </tr>
      {item.isAdvanced && isExpanded && item.orderDetailItem && (
        <tr>
          <td colSpan={colCount} className="p-0">
            <SofaConfigurationDetail item={item.orderDetailItem} />
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}
