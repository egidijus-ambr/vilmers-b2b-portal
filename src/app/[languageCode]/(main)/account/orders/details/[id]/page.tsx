"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import OrderCard from "@modules/account/components/order-card"
import { retrieveOrder } from "@lib/data/orders"

export default function OrderDetailsPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = params?.id as string

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }

    if (!orderId) {
      router.push("/account/orders")
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        const orderData = await retrieveOrder(orderId)
        setOrder(orderData)
      } catch (error) {
        console.error("Error loading order:", error)
        setError("Failed to load order details")
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [customer, router, orderId])

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

  if (error || !order) {
    return (
      <div className="w-full" data-testid="order-details-error">
        <div className="mb-8 flex flex-col gap-y-4">
          <h1 className="text-2xl-semi">Order Details</h1>
          <p className="text-base-regular text-red-600">
            {error || "Order not found"}
          </p>
          <button
            onClick={() => router.push("/account/orders")}
            className="w-fit px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="order-details-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Order Details</h1>
      </div>
      <OrderCard order={order} />
    </div>
  )
}
