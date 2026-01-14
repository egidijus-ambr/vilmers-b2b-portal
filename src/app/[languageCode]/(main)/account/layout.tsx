"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"
import { CustomerProvider } from "@lib/context/customer-context"
import { retrieveCustomer } from "@lib/data/customer"
import { ExtendedStoreCustomer } from "@lib/types/customer"

type CustomerType = ExtendedStoreCustomer | null

export default function AccountPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [customer, setCustomer] = useState<CustomerType>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true)
        setError(null)
        const customerData = await retrieveCustomer()
        setCustomer(customerData)
      } catch (error) {
        console.error("[AccountPageLayout] Error retrieving customer:", error)
        setCustomer(null)
        setError("Failed to load customer data")
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

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
          {children}
          <Toaster />
        </AccountLayout>
      </CustomerProvider>
    </Suspense>
  )
}
