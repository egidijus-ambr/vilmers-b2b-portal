import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  console.log("[OverviewTemplate] Dashboard page loading...")

  const customer = await retrieveCustomer().catch((error) => {
    console.error("[OverviewTemplate] Error retrieving customer:", error)
    return null
  })

  console.log(
    "[OverviewTemplate] Customer result:",
    customer ? "customer found" : "no customer"
  )

  const orders = (await listOrders().catch(() => null)) || null

  if (!customer) {
    console.log("[OverviewTemplate] No customer found, calling notFound()")
    notFound()
  }

  console.log("[OverviewTemplate] Rendering Overview component")
  return <Overview customer={customer} orders={orders} />
}
