"use client"

import ItemsTemplate from "./items"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { useCustomer } from "@lib/context/customer-context"
import { useCart } from "@lib/context/cart-context"

const CartTemplate = () => {
  const { customer } = useCustomer()
  const { items, isLoading } = useCart()

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {items.length > 0 || isLoading ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                <div className="bg-white py-6">
                  {/* Summary will be updated in future iteration */}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
