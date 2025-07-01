"use client"

import { HttpTypes } from "@medusajs/types"
import ActionCard from "../action-card"
import ManagerProfileCard from "../manager-profile-card"
import OrdersTable from "../orders-table"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: Order[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const actionCards = [
    {
      title: "Place an order",
      description:
        "Easily manage, track, and resolve disputes or requests with streamlined tools and updates.",
      onClick: () => console.log("Place order clicked"),
    },
    {
      title: "Claims",
      description:
        "Easily manage, track, and resolve disputes or requests with streamlined tools and updates.",
      onClick: () => console.log("Claims clicked"),
    },
    {
      title: "Settings",
      description:
        "Easily manage, track, and resolve disputes or requests with streamlined tools and updates.",
      onClick: () => console.log("Settings clicked"),
    },
    {
      title: "Explosion rules",
      description:
        "Easily manage, track, and resolve disputes or requests with streamlined tools and updates.",
      onClick: () => console.log("Explosion rules clicked"),
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

      <h1 className="self-stretch justify-start text-dark-blue text-4xl font-medium">
        {customer?.first_name || "User"}
      </h1>

      {/* Action Cards and Profile Section */}
      <div className="grid grid-cols-3 gap-5 items-start">
        {/* Action Cards Grid - Takes 2 columns */}
        <div className="col-span-2 grid grid-cols-2 gap-5">
          {actionCards.map((card, index) => (
            <ActionCard
              key={index}
              title={card.title}
              description={card.description}
              onClick={card.onClick}
            />
          ))}
        </div>

        {/* Manager Profile Card - Takes 1 column */}
        <div className="col-span-1 w-full h-fit">
          <ManagerProfileCard
            name="John Doe"
            email="johndoe@mail.com"
            phone="+380 63 566 6767"
            languages={["UA", "LT"]}
          />
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-10">
        {orders && orders.length > 0 ? (
          <OrdersTable orders={orders} />
        ) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Overview
