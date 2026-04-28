"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { formatPrice } from "@lib/util/money"
import { capitalizeFirstLetter } from "@lib/util/string"
import StatusBadge from "../status-badge"
import ReferencesTooltip from "../references-tooltip"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations, useI18n } from "@lib/i18n"
import { useCustomer } from "@lib/context/customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import {
  TableHeader,
  TableHeaderCell,
} from "@modules/common/components/table-header"
import SearchInput from "@modules/common/components/search-input"
import TablePagination from "@modules/common/components/table-pagination"
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
  const router = useRouter()
  const params = useParams()
  const languageCode = params?.languageCode as string

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
  const isAgent = isAgentOrAdmin(customer)

  // Check if order details feature is enabled
  const isOrderDetailsEnabled =
    process.env.NEXT_PUBLIC_FEATURE_ORDER_DETAILS === "true"

  // Use ordersData if available, otherwise fall back to empty state
  const orders = ordersData?.orders || []
  const currentPage = ordersData?.currentPage || 1
  const totalPages = ordersData?.totalPages || 1
  const totalCount = ordersData?.totalCount || 0
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
          <div className="hidden md:flex w-[368px]">
            <SearchInput value={searchTerm} onChange={handleSearchChange} placeholder={t("search-placeholder")} />
          </div>
        </div>

        {/* Search - Shown on mobile below description */}
        <div className="md:hidden mt-4">
          <SearchInput value={searchTerm} onChange={handleSearchChange} placeholder={t("search-placeholder")} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mx-4 md:mx-6 border border-zinc-300">
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader>
            <TableHeaderCell className="px-3 md:px-6">
              {t("order-id")}
            </TableHeaderCell>
            {isAgent && (
              <TableHeaderCell className="hidden md:table-cell w-[300px]">
                Customer
              </TableHeaderCell>
            )}
            {!isAgent && (
              <TableHeaderCell className="hidden md:table-cell w-[300px]">
                Location
              </TableHeaderCell>
            )}
            <TableHeaderCell className="hidden lg:table-cell">
              {t("confirmed-delivery-date")}
            </TableHeaderCell>
            <TableHeaderCell className="hidden sm:table-cell">
              {t("type")}
            </TableHeaderCell>
            <TableHeaderCell>{t("items")}</TableHeaderCell>
            <TableHeaderCell>{t("status")}</TableHeaderCell>
            <TableHeaderCell align="right">
              {t("total-price")}
            </TableHeaderCell>
          </TableHeader>
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
                <tr
                  key={order.id}
                  onClick={
                    isOrderDetailsEnabled
                      ? () =>
                          router.push(
                            `/${languageCode}/account/orders/details/${order.id}`
                          )
                      : undefined
                  }
                  className={
                    isOrderDetailsEnabled
                      ? "cursor-pointer hover:bg-gray-50 transition-colors"
                      : "transition-colors"
                  }
                >
                  <td className="td-cell">
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
                    {order.order_items_count ?? order.items?.length ?? 0}
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
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        itemLabel="orders"
      />
    </div>
  )
}

export default OrdersTable
