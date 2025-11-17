"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import OrdersTable from "@modules/account/components/orders-table"
import { listOrdersWithPagination } from "@lib/data/orders"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"

interface OrdersPageState {
  orders: Order[]
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function OrdersPage() {
  const { customer } = useCustomer()
  const router = useRouter()
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
        const pageSize = 10
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

        console.log("Fetch orders result:", {
          page,
          offset,
          totalCount: result.totalCount,
          currentPage: result.currentPage,
          calculatedCurrentPage,
          calculatedTotalPages,
          calculatedHasNextPage,
          calculatedHasPreviousPage,
        })

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
          pageSize: 10,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }

    fetchOrders(1, debouncedSearchTerm)
  }, [customer, router, debouncedSearchTerm, fetchOrders])

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

  if (!customer) {
    return null // Will redirect
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <OrdersTable
        orders={ordersData?.orders || []}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        currentPage={ordersData?.currentPage || 1}
        totalPages={ordersData?.totalPages || 1}
        onPageChange={handlePageChange}
        totalCount={ordersData?.totalCount}
        pageSize={ordersData?.pageSize || 10}
        hasNextPage={ordersData?.hasNextPage || false}
        hasPreviousPage={ordersData?.hasPreviousPage || false}
        loading={loading}
      />
    </div>
  )
}
