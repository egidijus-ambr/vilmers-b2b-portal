"use client"

import ItemsTemplate from "./items"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import CartSummary from "@modules/cart/components/cart-summary"
import { useCustomer } from "@lib/context/customer-context"
import { useCart } from "@lib/context/cart-context"

const CartTemplate = () => {
  const { customer } = useCustomer()
  const { items, isLoading } = useCart()

  return (
    <div className="pb-12" data-testid="cart-container">
      {items.length > 0 || isLoading ? (
        <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
          <div className="small:col-span-2 flex flex-col gap-y-6">
            {!customer && (
              <>
                <SignInPrompt />
                <Divider />
              </>
            )}
            <ItemsTemplate />
          </div>
          <div className="relative">
            <div className="flex flex-col gap-y-8 sticky top-[120px]">
              <CartSummary />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <EmptyCartMessage />
        </div>
      )}
    </div>
  )
}

export default CartTemplate
