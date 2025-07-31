"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import OrdersTable from "@modules/account/components/orders-table"
import { listOrders } from "@lib/data/orders"

export default function OrdersPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const [orders, setOrders] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        const orderData = await listOrders()
        setOrders(orderData || [])
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
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

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <OrdersTable orders={orders || []} />
    </div>
  )
}
