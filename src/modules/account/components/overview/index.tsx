"use client"

import { HttpTypes } from "@medusajs/types"
import { useTranslations } from "@lib/i18n"
import { getStoreLoginLink } from "@lib/data/customer"
import ActionCard from "../action-card"
import ManagerProfileCard from "../manager-profile-card"
import OrdersTable from "../orders-table"
import {
  Order,
  CustomerManager,
} from "@lib/furnisystems-sdk/modules/customer/types"

type OverviewProps = {
  customer:
    | (HttpTypes.StoreCustomer & {
        managers?: CustomerManager[]
        spoken_languages?: string[]
      })
    | null
  orders: Order[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const { t } = useTranslations("account")

  const handlePlaceOrder = async () => {
    try {
      // Call the server action to get the store login link
      const storeUrl = await getStoreLoginLink()
      // Open the store URL in a new tab
      window.open(storeUrl, "_blank")
    } catch (error) {
      console.error("Error getting store login link:", error)
      // Fallback: open store URL without token
      window.open(process.env.NEXT_PUBLIC_BASE_URL, "_blank")
    }
  }

  const actionCards = [
    {
      title: t("place-an-order.title"),
      description: t("place-an-order.description"),
      onClick: handlePlaceOrder,
    },
    {
      title: t("claims.title"),
      description: t("claims.description"),
      onClick: () => console.log("Claims clicked"),
    },
    // {
    //   title: t("settings.title"),
    //   description: t("settings.description"),
    //   onClick: () => console.log("Settings clicked"),
    // },
    {
      title: t("exposition-rules.title"),
      description: t("exposition-rules.description"),
      onClick: () => window.open("/Exposition rules.pdf", "_blank"),
    },
  ]

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div data-testid="overview-page-wrapper" className="flex flex-col gap-10">
      {/* Limit and Date Row */}
      {/* Header */}

      <h1 className="self-stretch justify-start text-dark-blue text-2xl sm:text-3xl lg:text-4xl font-medium">
        {customer?.first_name || "User"}
      </h1>

      {/* Action Cards and Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Action Cards Grid - First on mobile, left side on large screens */}
        <div className="order-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {actionCards.map((card, index) => (
            <ActionCard
              key={index}
              title={card.title}
              description={card.description}
              onClick={card.onClick}
              buttonText={t("check")}
            />
          ))}
        </div>

        {/* Manager Profile Card - After action cards on mobile, right side on large screens */}
        <div className="order-2 lg:col-span-1 w-full h-fit">
          {customer?.managers && customer.managers.length > 0 ? (
            <ManagerProfileCard
              manager={customer.managers[0].manager}
             
            />
          ) : (
            <div className="h-[484px] bg-white rounded-lg p-6 flex items-center justify-center">
              <p className="text-gray-500">{t("no-manager-assigned")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-10">
        {orders && orders.length > 0 ? (
          <OrdersTable orders={orders} />
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">{t("no-orders-found")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Overview
