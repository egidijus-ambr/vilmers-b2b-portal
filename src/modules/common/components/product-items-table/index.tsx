"use client"

import React from "react"
import {
  TableHeader,
  TableHeaderCell,
} from "@modules/common/components/table-header"
import { ProductItemsTableProps } from "./types"
import { TableRow } from "./table-row"
import { MobileCard } from "./mobile-card"
import { useCanSeePrices } from "@lib/context/customer-context"

const ProductItemsTable: React.FC<ProductItemsTableProps> = ({
  items,
  renderActions,
  formatPrice,
  translations: t,
  showVolume,
  onReferenceChange,
}) => {
  const showPrices = useCanSeePrices()

  if (items.length === 0) return null

  return (
    <>
      {/* Mobile: card layout */}
      <div className="small:hidden bg-white">
        <div className="bg-gold-20 px-4 py-4">
          <span className="text-sm font-medium text-dark-blue">
            {t.orderItems}
          </span>
        </div>
        <div className="px-4">
          {items.map((item, index) => (
            <MobileCard
              key={item.id}
              item={item}
              index={index}
              formatPrice={formatPrice}
              showPrices={showPrices}
              translations={{
                noImage: t.noImage,
                customerReference: t.customerReference,
                quantity: t.quantity,
                showConfiguration: t.showConfiguration,
                hideConfiguration: t.hideConfiguration,
              }}
              renderActions={renderActions}
              onReferenceChange={onReferenceChange}
            />
          ))}
        </div>
      </div>

      {/* Desktop: table layout */}
      <div className="hidden small:block bg-white">
        <table className="w-full text-sm">
          <TableHeader>
            <TableHeaderCell>{t.orderItems}</TableHeaderCell>
            {showPrices && <TableHeaderCell>{t.unitPrice}</TableHeaderCell>}
            <TableHeaderCell>{t.quantity}</TableHeaderCell>
            {showVolume && <TableHeaderCell>{t.volume}</TableHeaderCell>}
            {showPrices && (
              <TableHeaderCell align="right">{t.total}</TableHeaderCell>
            )}
            {renderActions && <TableHeaderCell>{""}</TableHeaderCell>}
          </TableHeader>
          <tbody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                item={item}
                index={index}
                showVolume={showVolume}
                showPrices={showPrices}
                formatPrice={formatPrice}
                translations={{
                  noImage: t.noImage,
                  customerReference: t.customerReference,
                  showConfiguration: t.showConfiguration,
                  hideConfiguration: t.hideConfiguration,
                }}
                renderActions={renderActions}
                onReferenceChange={onReferenceChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ProductItemsTable
