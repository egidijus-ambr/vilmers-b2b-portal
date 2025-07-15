"use client"

import React, { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { formatPrice } from "@lib/util/money"
import StatusBadge from "../status-badge"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations, useI18n } from "@lib/i18n"

interface OrdersTableProps {
  orders: Order[]
}

const OrdersTable = ({ orders }: OrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const { t } = useTranslations("account")
  const { language } = useI18n()

  const filteredOrders = orders
    .filter(
      (order) =>
        (order.display_id?.toString() || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  return (
    <div className="bg-white pb-6">
      {/* Header */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl md:text-2xl font-medium text-gray-900">
              {t("orders")}
            </h2>
            <p className="text-gray-600 mt-2 max-w-md text-sm md:text-base">
              {t("orders-description")}
            </p>
          </div>

          {/* Search - Hidden on mobile, shown on desktop */}
          <div className="hidden md:flex">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-dark-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t("search-placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-[368px] pl-10 pr-3 py-3 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Search - Shown on mobile below description */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-dark-blue"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t("search-placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mx-4 md:mx-6 border border-zinc-300">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gold-10">
            <tr>
              <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("order-id")}
              </th>
              <th className="px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("date")}
              </th>
              <th className="hidden sm:table-cell px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("type")}
              </th>
              <th className="px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("items")}
              </th>
              <th className="px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="px-2 md:px-4 py-3 md:py-4 text-right text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("total-price")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order, index) => (
              <tr key={order.id}>
                <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                  {order.display_id || order.id.slice(-8)}
                </td>
                <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="hidden sm:table-cell px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                  {order.order_type || "-"}
                </td>
                <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                  {order.order_items_count || 0}
                </td>
                <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                  <StatusBadge
                    status={order.order_status || "AWAITING_CONFIRMATION"}
                  />
                </td>
                <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900 text-right">
                  {formatPrice({
                    amount: order.total_price,
                    currency_code: order.currency_code || "EUR",
                    language,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-center space-x-1 md:space-x-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-xs md:text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? "bg-gold-20 text-dark-blue"
                      : "text-dark-blue hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && (
              <>
                <span className="text-gray-400 text-xs md:text-sm">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-xs md:text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersTable
