import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { listOrders } from "@lib/data/orders"

// Force dynamic rendering to prevent caching of protected pages
export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  console.log("[OverviewTemplate] Dashboard page loading...")

  const orders = (await listOrders().catch(() => null)) || null

  console.log("[OverviewTemplate] Rendering Overview component")
  return <Overview orders={orders} />
}
