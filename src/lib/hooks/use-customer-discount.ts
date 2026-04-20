"use client"

import { useCustomer } from "@lib/context/customer-context"

/**
 * Returns the logged-in B2B customer's discount percentage or null when
 * the customer is absent, non-B2B, or has no discount set.
 */
export function useCustomerDiscount(): { discountPct: number | null } {
  const { customer } = useCustomer()
  const raw = customer?.b2b_customer_discount
  if (raw == null || raw === 0) {
    return { discountPct: null }
  }
  return { discountPct: raw }
}
