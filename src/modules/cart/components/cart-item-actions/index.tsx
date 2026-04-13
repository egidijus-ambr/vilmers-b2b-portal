"use client"

import { useState } from "react"
import { updateLineItem } from "@lib/data/cart"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import DeleteButton from "@modules/common/components/delete-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import Spinner from "@modules/common/icons/spinner"

interface CartItemActionsProps {
  itemId: string
  quantity: number
}

const CartItemActions = ({ itemId, quantity }: CartItemActionsProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (newQuantity: number) => {
    setError(null)
    setUpdating(true)
    await updateLineItem({
      lineId: itemId,
      quantity: newQuantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <DeleteButton id={itemId} />
        <CartItemSelect
          value={quantity}
          onChange={(value) =>
            changeQuantity(parseInt(value.target.value))
          }
          className="w-14 h-10 p-4"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option value={i + 1} key={i}>
              {i + 1}
            </option>
          ))}
        </CartItemSelect>
        {updating && <Spinner />}
      </div>
      <ErrorMessage error={error} />
    </div>
  )
}

export default CartItemActions
