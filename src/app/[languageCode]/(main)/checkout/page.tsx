"use client"

import { useEffect } from "react"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { useParams, useRouter } from "next/navigation"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CartSummary from "@modules/cart/components/cart-summary"

export default function Checkout() {
  const { items, isLoading } = useCart()
  const { customer } = useCustomer()
  const params = useParams()
  const router = useRouter()
  const languageCode = params.languageCode as string

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
        <div className="text-ui-fg-subtle">Loading...</div>
      </div>
    )
  }

  if (items.length === 0 || !customer) {
    return null
  }

  return (
    <div className="pb-12">
      <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
        <div className="small:col-span-2">
          <CheckoutForm />
        </div>
        <div className="relative">
          <div className="flex flex-col gap-y-8 sticky top-[120px]">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
