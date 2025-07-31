"use client"

import { useCustomer } from "@lib/context/customer-context"
import LoginTemplate from "@modules/account/templates/login-template"
import Overview from "@modules/account/components/overview"
import { useEffect, useState } from "react"
import { listOrders } from "@lib/data/orders"

export default function AccountPage() {
  const { customer } = useCustomer()
  const [orders, setOrders] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (customer) {
      setLoading(true)
      listOrders()
        .then((orderData) => {
          setOrders(orderData)
        })
        .catch((error) => {
          console.error("Error loading orders:", error)
          setOrders([])
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [customer])

  if (!customer) {
    return <LoginTemplate />
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return <Overview orders={orders} />
}
