import { Metadata } from "next"

import OrdersTable from "@modules/account/components/orders-table"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

// Disable caching for this page to ensure fresh order data
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Orders() {
  const orders = await listOrders()

  // Note: listOrders now returns an empty array when not authenticated
  // The authentication check is handled at the layout level

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <OrdersTable orders={orders} />
    </div>
  )
}
