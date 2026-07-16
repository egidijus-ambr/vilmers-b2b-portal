"use client"

import { useEffect, useRef, useState } from "react"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "@lib/i18n"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import type { CheckoutFormHandle, CheckoutFormState } from "@modules/checkout/templates/checkout-form"
import CartSummary from "@modules/cart/components/cart-summary"
import Button from "@modules/common/components/button"

export default function Checkout() {
  const { items, isLoading } = useCart()
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  const blockedNoActingCustomer = isAgentOrAdmin(customer) && !actingCustomer
  const { languageCode } = useParams() as { languageCode: string }
  const router = useRouter()
  const { t } = useTranslations("account")
  const checkoutRef = useRef<CheckoutFormHandle>(null)
  const [checkoutState, setCheckoutState] = useState<CheckoutFormState>({ isSubmitting: false })

  useEffect(() => {
    if (!isLoading && items.length === 0) {
      router.replace(`/${languageCode}/store`)
    }
  }, [isLoading, items.length, languageCode, router])

  useEffect(() => {
    if (!customer) {
      router.replace(`/${languageCode}/account`)
    }
  }, [customer, languageCode, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (items.length === 0 || !customer) {
    return null
  }

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-cart"), href: "/cart" },
    { label: t("checkout"), href: null },
  ]

  return (
    <>
      <PageHeader
        title={t("checkout")}
        breadcrumbItems={breadcrumbItems}
        level="h2"
      />
      <PageContent>
        <div className="pb-12">
          <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
            <div className="small:col-span-2">
              <CheckoutForm ref={checkoutRef} onStateChange={setCheckoutState} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-[120px]">
                <CartSummary>
                  <Button
                    className="w-full"
                    onClick={
                      blockedNoActingCustomer
                        ? undefined
                        : () => checkoutRef.current?.placeOrder()
                    }
                    disabled={checkoutState.isSubmitting || blockedNoActingCustomer}
                    title={
                      blockedNoActingCustomer
                        ? "Select a customer first"
                        : undefined
                    }
                  >
                    {checkoutState.isSubmitting ? "Placing order..." : "Place Order"}
                  </Button>
                </CartSummary>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}
