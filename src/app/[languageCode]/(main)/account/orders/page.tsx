"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import OrdersTable from "@modules/account/components/orders-table"

export default function OrdersPage() {
  const { customer } = useCustomer()
  const router = useRouter()

  if (!customer) {
    router.push("/account")
    return null
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <OrdersTable />
    </div>
  )
}
