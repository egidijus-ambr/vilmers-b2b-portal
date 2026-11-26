"use client"

import { useCallback, useState } from "react"
import ItemsTemplate from "./items"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import CartSummary from "@modules/cart/components/cart-summary"
import Toast from "@modules/common/components/toast"
import Spinner from "@modules/common/icons/spinner"
import { SkeletonCartContent } from "@modules/skeletons/templates/skeleton-cart-page"
import { useCustomer } from "@lib/context/customer-context"
import { CartBusyError, useCart } from "@lib/context/cart-context"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"
import { useTranslations } from "@lib/i18n"

const CartTemplate = ({
  items: itemsProp,
  readOnly = false,
  children,
  summaryTitle,
}: {
  items?: FurnisystemsCartItem[]
  readOnly?: boolean
  children?: React.ReactNode
  summaryTitle?: string
} = {}) => {
  const { customer } = useCustomer()
  const { t } = useTranslations("account")
  const { t: tc } = useTranslations("common")
  const ctx = useCart()
  // Loading / busy states only apply to the live (context-bound) cart; a
  // read-only snapshot passed via `items` is always rendered as-is.
  const bound = !itemsProp
  const items = itemsProp ?? ctx.items
  const isLoading = bound && ctx.isLoading
  const isMutating = bound && ctx.isMutating
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const handleMutationError = useCallback(
    (error: unknown) => {
      // A rejected second click while busy is not a failure worth surfacing.
      if (error instanceof CartBusyError) return
      setErrorToast(tc("error-try-again"))
    },
    [tc]
  )
  const closeToast = useCallback(() => setErrorToast(null), [])

  if (isLoading) {
    return <SkeletonCartContent />
  }

  return (
    <div className="pb-12" data-testid="cart-container">
      {items.length > 0 ? (
        <div className="relative" aria-busy={isMutating}>
          <div
            className="grid grid-cols-1 small:grid-cols-3 gap-6"
            // Blocks every control (incl. the checkout / offer links, which
            // `disabled` cannot stop) while a mutation is in flight.
            inert={isMutating}
          >
            <div className="small:col-span-2 flex flex-col gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate
                items={itemsProp}
                readOnly={readOnly}
                onMutationError={handleMutationError}
              />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-[120px]">
                <CartSummary items={itemsProp} title={summaryTitle}>{children}</CartSummary>
              </div>
            </div>
          </div>
          {isMutating && (
            <div
              className="absolute inset-0 z-10 bg-white/60 cursor-wait"
              data-testid="cart-busy-overlay"
            >
              {/* Sticky so the spinner stays in view on long carts. */}
              <div
                className="sticky top-[40vh] flex justify-center py-8 text-dark-blue"
                role="status"
              >
                <Spinner size="32" />
                <span className="sr-only">{tc("loading")}</span>
              </div>
            </div>
          )}
        </div>
      ) : readOnly ? (
        <div>
          <p className="text-gray-500 text-sm py-8">{t("cart-empty")}</p>
        </div>
      ) : (
        <div>
          <EmptyCartMessage />
        </div>
      )}
      {errorToast && (
        <Toast message={errorToast} type="error" onClose={closeToast} />
      )}
    </div>
  )
}

export default CartTemplate
