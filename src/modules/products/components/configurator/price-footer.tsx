"use client"

import React, { useState } from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { applyDiscount } from "@configurator/lib/price-utils"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import PriceDisplay from "@modules/common/components/price-display"
import Button from "@modules/common/components/button"

type PriceFooterProps = {
  currency?: string
  volume?: number
  onAddToCart: () => Promise<void>
}

const PriceFooter = ({ currency = "EUR", volume = 0, onAddToCart }: PriceFooterProps) => {
  const { state, dispatch } = useConfigurator()
  const { totalPrice, quantity } = state
  const [isAdding, setIsAdding] = useState(false)
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  const blockedNoActingCustomer = isAgentOrAdmin(customer) && !actingCustomer

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await onAddToCart()
    } finally {
      setIsAdding(false)
    }
  }

  const { discountPct } = useCustomerDiscount()
  const displayPrice = totalPrice != null ? totalPrice * quantity : null
  const priced =
    displayPrice != null ? applyDiscount(displayPrice, discountPct) : null
  const displayVolume = volume * quantity

  return (
    <div className="sticky bottom-0 mt-4 border-t bg-gold-20 pt-4 pb-4 flex items-center justify-between px-6">
      {/* Volume display — left side */}
      <div className="flex items-center">
        {displayVolume > 0 && (
          <div className="text-sm text-gray-600">
            <span className="text-gray-400">Volume</span>{" "}
            <span className="font-medium">{displayVolume.toFixed(2)} m³</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Quantity selector */}
        <div className="flex items-center border rounded border-gold">
          <button
            className="px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            onClick={() =>
              dispatch({
                type: "SET_QUANTITY",
                payload: Math.max(1, quantity - 1),
              })
            }
            disabled={quantity <= 1}
          >
            -
          </button>
          <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">
            {quantity}
          </span>
          <button
            className="px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() =>
              dispatch({ type: "SET_QUANTITY", payload: quantity + 1 })
            }
          >
            +
          </button>
        </div>

        {/* Price display */}
        <div className="text-right">
          {priced != null ? (
            <PriceDisplay
              regular={priced.regular}
              discounted={priced.hasDiscount ? priced.discounted : null}
              currencyCode={currency ?? "EUR"}
              size="lg"
              align="right"
            />
          ) : (
            <p className="text-sm text-gray-400">Select options to see price</p>
          )}
        </div>

        {/* Add to cart */}
        <Button
          onClick={blockedNoActingCustomer ? undefined : handleAddToCart}
          disabled={
            totalPrice == null ||
            totalPrice <= 0 ||
            isAdding ||
            blockedNoActingCustomer
          }
          title={blockedNoActingCustomer ? "Select a customer first" : undefined}
        >
          {isAdding ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Adding...
            </span>
          ) : (
            "Add to Cart"
          )}
        </Button>
      </div>
    </div>
  )
}

export default PriceFooter
