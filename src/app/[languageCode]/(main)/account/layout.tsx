import { Suspense } from "react"
import { retrieveCustomer } from "@lib/data/customer"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"
import { CustomerProvider } from "@lib/context/customer-context"

export default async function AccountPageLayout({
  dashboard,
  login,
  children,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
  children: React.ReactNode
}) {
  console.log("[AccountPageLayout] Starting account page layout...")

  const customer = await retrieveCustomer().catch((error) => {
    console.error("[AccountPageLayout] Error retrieving customer:", error)
    return null
  })

  console.log(
    "[AccountPageLayout] Customer retrieval result:",
    customer ? "customer found" : "no customer"
  )

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <CustomerProvider customer={customer}>
        <AccountLayout customer={customer}>
          {customer ? dashboard : login}
          {children}
          <Toaster />
        </AccountLayout>
      </CustomerProvider>
    </Suspense>
  )
}
