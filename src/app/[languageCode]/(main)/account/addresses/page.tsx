"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AddressBook from "@modules/account/components/address-book"
import { listRegions } from "@lib/data/regions"

export default function AddressesPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const [region, setRegion] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }

    const fetchRegions = async () => {
      try {
        setLoading(true)
        const regionData = await listRegions()
        // Use the first region as default, or you could implement region selection
        setRegion(regionData && regionData.length > 0 ? regionData[0] : null)
      } catch (error) {
        console.error("Error loading regions:", error)
        setRegion(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRegions()
  }, [customer, router])

  if (!customer) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!region) {
    return (
      <div className="w-full" data-testid="addresses-page-wrapper">
        <div className="mb-8 flex flex-col gap-y-4">
          <h1 className="">Shipping Addresses</h1>
          <p className="text-base-regular">
            No regions available. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="">Shipping Addresses</h1>
        <p className="text-base-regular">
          View and update your shipping addresses, you can add as many as you
          like. Saving your addresses will make them available during checkout.
        </p>
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
