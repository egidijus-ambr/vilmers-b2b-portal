"use client"

import React, { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import StatusBadge from "../status-badge"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"

interface OrdersTableProps {
  orders: Order[]
}

const OrdersTable = ({ orders }: OrdersTableProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const filteredOrders = orders.filter(
    (order) =>
      (order.display_id?.toString() || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Orders</h2>
            <p className="text-gray-600 mt-2 max-w-md">
              Track, manage, and process purchases seamlessly with real-time
              updates and intuitive tools.
            </p>
          </div>

          {/* Search */}
          <div className="flex">
            <div className="relative max-w-md ">
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
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-[368px] pl-10 pr-3 py-3 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-900 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-right text-sm font-medium text-gray-900 uppercase tracking-wider">
                Total Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order, index) => (
              <tr
                key={order.invoice_code}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{order.display_id || order.id.slice(-8)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.order_type || "-"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.order_items_count || 0}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge
                    status={order.order_status || "AWAITING_CONFIRMATION"}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ${order.total_price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-12 h-12 rounded-full text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            {totalPages > 5 && (
              <>
                <span className="text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-12 h-12 rounded-full text-sm font-medium transition-colors ${
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
