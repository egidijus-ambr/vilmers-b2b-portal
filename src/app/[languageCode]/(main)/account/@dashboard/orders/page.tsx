import { Metadata } from "next"

import OrdersTable from "@modules/account/components/orders-table"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

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
