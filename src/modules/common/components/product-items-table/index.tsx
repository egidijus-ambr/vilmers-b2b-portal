"use client"

import React from "react"
import {
  TableHeader,
  TableHeaderCell,
} from "@modules/common/components/table-header"
import { ProductItemsTableProps } from "./types"
import { TableRow } from "./table-row"
import { MobileCard } from "./mobile-card"

const ProductItemsTable: React.FC<ProductItemsTableProps> = ({
  items,
  renderActions,
  formatPrice,
  translations: t,
  showVolume,
}) => {
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
              translations={{
                noImage: t.noImage,
                customerReference: t.customerReference,
                quantity: t.quantity,
                showConfiguration: t.showConfiguration,
                hideConfiguration: t.hideConfiguration,
              }}
              renderActions={renderActions}
            />
          ))}
        </div>
      </div>

      {/* Desktop: table layout */}
      <div className="hidden small:block bg-white">
        <table className="w-full text-sm">
          <TableHeader>
            <TableHeaderCell>{t.orderItems}</TableHeaderCell>
            <TableHeaderCell>{t.unitPrice}</TableHeaderCell>
            <TableHeaderCell>{t.quantity}</TableHeaderCell>
            {showVolume && <TableHeaderCell>{t.volume}</TableHeaderCell>}
            <TableHeaderCell align="right">{t.total}</TableHeaderCell>
            {renderActions && <TableHeaderCell>{""}</TableHeaderCell>}
          </TableHeader>
          <tbody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                item={item}
                index={index}
                showVolume={showVolume}
                formatPrice={formatPrice}
                translations={{
                  noImage: t.noImage,
                  customerReference: t.customerReference,
                  showConfiguration: t.showConfiguration,
                  hideConfiguration: t.hideConfiguration,
                }}
                renderActions={renderActions}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ProductItemsTable
