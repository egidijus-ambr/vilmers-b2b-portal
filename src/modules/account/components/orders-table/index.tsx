"use client"

import React, { useEffect, useState, useCallback } from "react"
import { formatPrice } from "@lib/util/money"
import { capitalizeFirstLetter } from "@lib/util/string"
import StatusBadge from "../status-badge"
import ReferencesTooltip from "../references-tooltip"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations, useI18n } from "@lib/i18n"
import { useCustomer } from "@lib/context/customer-context"
import { listOrdersWithPagination } from "@lib/data/orders"

interface OrdersPageState {
  orders: Order[]
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface OrdersTableProps {
  /** Optional prop to show only limited number of orders (for overview page) */
  pageSize?: number
}

const OrdersTable = ({ pageSize = 10 }: OrdersTableProps) => {
  const { customer } = useCustomer()
  const { t } = useTranslations("account")
  const { language } = useI18n()

  const [ordersData, setOrdersData] = useState<OrdersPageState | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Debounced search to avoid too many API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchOrders = useCallback(
    async (page: number = 1, search: string = "") => {
      try {
        setLoading(true)
        const offset = (page - 1) * pageSize
        const result = await listOrdersWithPagination(pageSize, offset, search)

        // Calculate currentPage based on the page parameter we sent
        const calculatedCurrentPage = page
        const calculatedTotalPages = Math.ceil(
          (result.totalCount || 0) / pageSize
        )
        const calculatedHasNextPage =
          calculatedCurrentPage < calculatedTotalPages
        const calculatedHasPreviousPage = calculatedCurrentPage > 1

        setOrdersData({
          orders: result.orders || [],
          totalCount: result.totalCount || 0,
          currentPage: calculatedCurrentPage, // Use the page we requested
          totalPages: calculatedTotalPages,
          pageSize: pageSize,
          hasNextPage: calculatedHasNextPage,
          hasPreviousPage: calculatedHasPreviousPage,
        })
      } catch (error) {
        console.error("Error loading orders:", error)
        setOrdersData({
          orders: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 1,
          pageSize,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  useEffect(() => {
    if (!customer) {
      return
    }

    fetchOrders(1, debouncedSearchTerm)
  }, [customer, debouncedSearchTerm, fetchOrders])

  const handlePageChange = (page: number) => {
    fetchOrders(page, debouncedSearchTerm)
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    // Reset to page 1 when searching
    if (term !== debouncedSearchTerm) {
      setOrdersData((prev) => (prev ? { ...prev, currentPage: 1 } : null))
    }
  }

  // Early returns after all hooks have been called
  if (!customer) {
    return null
  }

  // Show empty state if no orders found
  // if (ordersData && ordersData.orders.length === 0 && !loading) {
  //   return (
  //     <div className="bg-white rounded-lg p-8 text-center">
  //       <p className="text-gray-500">No orders found</p>
  //     </div>
  //   )
  // }

  // Check if user is an agent
  const isAgent = customer?.role === "agent" || customer?.role === "admin"

  // Use ordersData if available, otherwise fall back to empty state
  const orders = ordersData?.orders || []
  const currentPage = ordersData?.currentPage || 1
  const totalPages = ordersData?.totalPages || 1
  const totalCount = ordersData?.totalCount || 0
  const hasNextPage = ordersData?.hasNextPage || false
  const hasPreviousPage = ordersData?.hasPreviousPage || false

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
                onChange={(e) => handleSearchChange(e.target.value)}
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
              onChange={(e) => handleSearchChange(e.target.value)}
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
              {isAgent && (
                <th className="hidden md:table-cell px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider w-[300px]">
                  Customer
                </th>
              )}
              {!isAgent && (
                <th className="hidden md:table-cell px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider w-[300px]">
                  Location
                </th>
              )}
              <th className="hidden lg:table-cell px-2 md:px-4 py-3 md:py-4 text-left text-xs md:text-sm font-medium text-gray-900 uppercase tracking-wider">
                {t("confirmed-delivery-date")}
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
          {ordersData && ordersData.orders.length === 0 && !loading && (
            <tbody>
              <tr>
                <td
                  colSpan={isAgent ? 8 : 7}
                  className="text-center py-8 text-gray-500"
                >
                  {t("no-orders-found")}
                </td>
              </tr>
            </tbody>
          )}
          <tbody>
            {loading ? (
              // Loading skeleton rows

              <tr>
                <td
                  colSpan={isAgent ? 8 : 7}
                  className="text-center py-8 text-gray-500"
                >
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dark-blue mx-auto"></div>{" "}
                </td>
              </tr>
            ) : (
              // Actual order rows
              orders.map((order, index) => (
                <tr key={order.id}>
                  <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                    <div className="font-medium">
                      {order.display_id || order.id.slice(-8)}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="hidden md:table-cell px-2 md:px-4 py-3 md:py-4 text-gray-900 w-[100px] max-w-[100px]">
                    <div className="break-words">
                      {isAgent ? (
                        <div className="text-xs leading-tight">
                          {order.purchased_by?.name || "-"}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600 leading-tight mt-1 flex items-start gap-1">
                          {order.purchased_subAccount?.name && (
                            <>
                              <svg
                                className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              <span className="flex-1">
                                {order.purchased_subAccount?.name}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {isAgent && order.purchased_subAccount?.name && (
                        <div className="text-[10px] text-gray-600 leading-tight mt-1 flex items-start gap-1">
                          <svg
                            className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <span className="flex-1">
                            {order.purchased_subAccount.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="hidden lg:table-cell px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    {order.confirmed_delivery_date
                      ? new Date(
                          order.confirmed_delivery_date
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="hidden sm:table-cell px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <span>
                        {order.order_type
                          ? capitalizeFirstLetter(order.order_type)
                          : "-"}
                      </span>
                      {order.order_item_references &&
                        order.order_item_references.length > 0 && (
                          <ReferencesTooltip
                            references={order.order_item_references}
                          >
                            <svg
                              className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </ReferencesTooltip>
                        )}
                    </div>
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
                    <div
                      className={`flex items-center justify-end gap-1 ${
                        order.total_price_confirmed
                          ? "font-medium text-green-700"
                          : ""
                      }`}
                      title={
                        order.total_price_confirmed
                          ? "Confirmed Price"
                          : "Unconfirmed Price"
                      }
                    >
                      {order.total_price_confirmed && (
                        <svg
                          className="h-4 w-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {formatPrice({
                        amount:
                          order.total_price_confirmed || order.total_price,
                        currency_code: order.currency_code || "EUR",
                        language,
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Page info */}
            <div className="text-sm text-gray-600">
              {totalCount && (
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  orders
                </span>
              )}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center space-x-1 md:space-x-2">
              {/* Previous button */}
              <button
                onClick={() =>
                  hasPreviousPage && handlePageChange(currentPage - 1)
                }
                disabled={!hasPreviousPage}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded transition-colors ${
                  hasPreviousPage
                    ? "text-dark-blue hover:bg-gray-100"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                Previous
              </button>

              {/* Page numbers - simplified logic */}
              {(() => {
                const pages = []
                const maxPages = Math.min(totalPages, 5)

                let startPage = Math.max(
                  1,
                  currentPage - Math.floor(maxPages / 2)
                )
                let endPage = Math.min(totalPages, startPage + maxPages - 1)

                // Adjust start if we're near the end
                if (endPage - startPage + 1 < maxPages) {
                  startPage = Math.max(1, endPage - maxPages + 1)
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => {
                        console.log(
                          `Clicking page ${i}, current page is ${currentPage}`
                        )
                        handlePageChange(i)
                      }}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-xs md:text-sm font-medium transition-colors ${
                        currentPage === i
                          ? "bg-gold-20 text-dark-blue border-2 border-gold-30 font-bold"
                          : "text-dark-blue hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      {i}
                    </button>
                  )
                }

                return pages
              })()}

              {/* Next button */}
              <button
                onClick={() => hasNextPage && handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded transition-colors ${
                  hasNextPage
                    ? "text-dark-blue hover:bg-gray-100"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersTable
