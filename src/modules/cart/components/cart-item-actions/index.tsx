"use client"

import { useState } from "react"
import { useCart } from "@lib/context/cart-context"
import { Spinner, Trash } from "@medusajs/icons"

interface CartItemActionsProps {
  cartItemId: number
  quantity: number
}

const CartItemActions = ({ cartItemId, quantity }: CartItemActionsProps) => {
  const { updateItemQuantity, removeItem } = useCart()
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuantityChange = async (newQuantity: number) => {
    setError(null)
    setUpdating(true)
    try {
      await updateItemQuantity(cartItemId, newQuantity)
    } catch (err: any) {
      setError(err.message || "Failed to update quantity")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await removeItem(cartItemId)
    } catch (err: any) {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <button
          className="flex items-center text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
          onClick={handleDelete}
        >
          {deleting ? <Spinner className="animate-spin" /> : <Trash />}
        </button>
        <div className="flex items-center border rounded border-gold">
          <button
            className="px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || updating}
          >
            -
          </button>
          <span className="px-3 py-2 text-sm font-medium min-w-[2rem] text-center">
            {quantity}
          </span>
          <button
            className="px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={updating}
          >
            +
          </button>
        </div>
        {updating && <Spinner className="animate-spin" />}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default CartItemActions
