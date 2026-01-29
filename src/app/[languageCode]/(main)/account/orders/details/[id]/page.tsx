"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { retrieveOrder } from "@lib/data/orders"
import { OrderDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import OrderDetailsTemplate from "@modules/account/components/order-details"
import Breadcrumb from "@modules/common/components/breadcrumb"
import { useTranslations } from "@lib/i18n"

const isFeatureEnabled =
  process.env.NEXT_PUBLIC_FEATURE_ORDER_DETAILS === "true"

export default function OrderDetailsPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslations("account")
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = params?.id as string
  const languageCode = params?.languageCode as string

  useEffect(() => {
    if (!isFeatureEnabled) {
      router.push(`/${languageCode}/account/orders`)
      return
    }

    if (!customer) {
      router.push(`/${languageCode}/account`)
      return
    }

    if (!orderId) {
      router.push(`/${languageCode}/account/orders`)
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        const orderData = await retrieveOrder(orderId)
        if (!orderData) {
          setError(t("order-not-found"))
          return
        }
        setOrder(orderData)
      } catch (err) {
        console.error("Error loading order:", err)
        setError(t("order-load-error"))
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [customer, router, orderId, languageCode, t])

  if (!isFeatureEnabled || !customer) {
    return null
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark-blue"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="w-full" data-testid="order-details-error">
        <div className="mb-8 flex flex-col gap-y-4">
          <h1 className="text-2xl font-medium text-dark-blue">
            {t("order-details")}
          </h1>
          <p className="text-sm text-red-600">
            {error || t("order-not-found")}
          </p>
          <button
            onClick={() => router.push(`/${languageCode}/account/orders`)}
            className="w-fit px-4 py-2 bg-dark-blue text-white hover:opacity-90 transition-opacity"
          >
            {t("back-to-orders")}
          </button>
        </div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-my-profile"), href: "/account" },
    { label: t("breadcrumb-orders-history"), href: "/account/orders" },
    { label: `#${order.display_id}`, href: null },
  ]

  return (
    <div className="w-full" data-testid="order-details-wrapper">
      <Breadcrumb items={breadcrumbItems} />
      <OrderDetailsTemplate order={order} />
    </div>
  )
}
