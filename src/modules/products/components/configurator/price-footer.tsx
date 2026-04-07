"use client"

import React from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { priceFormatter } from "@configurator/lib/price-utils"

type PriceFooterProps = {
  currency?: string
  onAddToCart: () => void
}

const PriceFooter = ({ currency = "EUR", onAddToCart }: PriceFooterProps) => {
  const { state, dispatch } = useConfigurator()
  const { totalPrice, quantity } = state

  const displayPrice = totalPrice != null ? totalPrice * quantity : null

  return (
    <div className="sticky bottom-0 mt-4 border-t bg-gold-20 pt-4 pb-4 flex items-center justify-between  px-6 ">
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
          {displayPrice != null ? (
            <p className="text-lg font-semibold">
              {priceFormatter(displayPrice, currency)}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Select options to see price</p>
          )}
        </div>
      </div>

      {/* Add to cart */}
      <button
        className="bg-[#1e2a3a] text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-[#2a3a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onAddToCart}
        disabled={totalPrice == null || totalPrice <= 0}
      >
        Add to Cart
      </button>
    </div>
  )
}

export default PriceFooter
