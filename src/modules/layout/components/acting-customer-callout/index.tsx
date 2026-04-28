"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"

export default function ActingCustomerCallout() {
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()

  if (!isAgentOrAdmin(customer)) return null
  if (actingCustomer) return null

  return (
    <p role="status" className="text-right text-sm text-dark-blue">
      You&apos;re viewing the general catalog. Select a customer to see their
      pricing and place an order.
    </p>
  )
}
