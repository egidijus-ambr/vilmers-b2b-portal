"use client"

import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { useParams, redirect } from "next/navigation"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"

export default function Checkout() {
  const { items, isLoading } = useCart()
  const { customer } = useCustomer()
  const params = useParams()
  const languageCode = params.languageCode as string

  if (!isLoading && items.length === 0) {
    redirect(`/${languageCode}/store`)
  }

  if (!customer) {
    redirect(`/${languageCode}/account`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-ui-fg-subtle">Loading...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <CheckoutForm />
      <CheckoutSummary />
    </div>
  )
}
