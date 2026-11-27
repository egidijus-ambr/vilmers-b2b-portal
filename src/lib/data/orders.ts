"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { Order, OrderDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import { withActingRetry } from "@lib/furnisystems-sdk/client/v1-data"
import {
  isV1OrderId,
  mapV1OrderDetail,
  mapV1OrderPage,
  v1PageFromOffset,
} from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { runIdentityCall, v1GetOrder, v1ListOrders } from "./me-v1"
import {
  actingCustomerIdForV1,
  dropActingCookie,
  dropActingCookieIfStale,
} from "./v1-acting"

/*
 * Orders on REST v1 (portal REST slice 7 / 2c-7) when the request has a
 * usable v1 access token (v1-transport-rule.ts); the GraphQL calls below are
 * the unchanged path for legacy-only sessions and the target of a v1 401.
 *
 * Scope (backend, the same service as GraphQL getCustomerOrders): a customer
 * login its company's orders, a sub-account login its sub-account's, an
 * agent / manager its own company's AND its managed customers', a portal
 * admin every order. D4: with X-Acting-Customer-Id (sent for agent / admin
 * with a selected customer, v1-acting.ts) only that customer's orders. A
 * refused acting header (403 ACTING_NOT_ALLOWED) or a stale acting id (404)
 * is retried once without it; any other 403 is not (withActingRetry).
 *
 * Errors on v1 (403 / 429 / 5xx): the same empty answer a GraphQL error gives
 * (the table shows "no orders"; the detail page "order not found"). 404 on
 * the detail = not found / not yours (never someone else's order).
 */
const emptyOrdersPage = (limit: number) => ({
  orders: [] as Order[],
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  pageSize: limit,
  hasNextPage: false,
  hasPreviousPage: false,
})

async function v1OrdersPage(
  bearer: string,
  limit: number,
  offset: number,
  searchText?: string
) {
  const { page, pageSize } = v1PageFromOffset(limit, offset)
  const search = searchText && searchText.trim() ? searchText.trim().slice(0, 200) : undefined
  const acting = await actingCustomerIdForV1()
  const body = await withActingRetry(
    acting,
    (actingId) => v1ListOrders(bearer, actingId, { page, pageSize, search }),
    dropActingCookie
  )
  return mapV1OrderPage(body, pageSize)
}

export const retrieveOrder = async (
  id: string
): Promise<OrderDetail | null> => {
  unstable_noStore()

  try {
    const validation = await validateSession()

    if (!validation.isValid) {
      console.log("[retrieveOrder] Session validation failed:", validation.error)
      return null
    }

    const order = await runIdentityCall<OrderDetail | null>("retrieveOrder", {
      v1: async (bearer) => {
        if (!isV1OrderId(id)) return null
        const acting = await actingCustomerIdForV1()
        const body = await withActingRetry(
          acting,
          (actingId) => v1GetOrder(bearer, actingId, id),
          // An order outside the acting customer's scope is not a stale
          // acting id: drop the cookie only if /me confirms the 404.
          dropActingCookieIfStale(bearer, acting)
        )
        return mapV1OrderDetail(body)
      },
      graphql: () => sdk.customer.getCustomerOrderById(id),
      guest: () => null,
      onError: () => null,
    })

    if (!order) {
      console.log("[retrieveOrder] Order not found for ID:", id)
      return null
    }

    return order
  } catch (error) {
    console.error("[retrieveOrder] Error fetching order:", error)
    return null
  }
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
): Promise<Order[]> => {
  // Prevent caching for authentication-related data
  unstable_noStore()

  console.log(
    "[listOrders] Starting orders retrieval with session validation..."
  )

  try {
    // Use the new session validation system
    const validation = await validateSession()

    if (!validation.isValid) {
      console.log("[listOrders] Session validation failed:", validation.error)
      return []
    }

    const result = await runIdentityCall("listOrders", {
      v1: (bearer) => v1OrdersPage(bearer, limit, offset),
      graphql: () =>
        sdk.customer.getCustomerOrders({
          take: limit,
          skip: offset,
        }),
      guest: () => emptyOrdersPage(limit),
      onError: () => emptyOrdersPage(limit),
    })

    // Extract orders array from the result
    const orders = result.orders

    // set order display_id
    orders.forEach((order) => {
      order.display_id = order.order_external_code || order.order_code
    })

    console.log("[listOrders] Orders retrieved successfully:", orders.length)
    return orders
  } catch (error) {
    console.error("[listOrders] Error fetching orders:", error)
    return []
  }
}

export const listOrdersWithPagination = async (
  limit: number = 10,
  offset: number = 0,
  searchText?: string
): Promise<{
  orders: Order[]
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}> => {
  // Prevent caching for authentication-related data
  unstable_noStore()

  console.log(
    "[listOrdersWithPagination] Starting orders retrieval with pagination..."
  )

  try {
    // Use the new session validation system
    const validation = await validateSession()

    if (!validation.isValid) {
      console.log(
        "[listOrdersWithPagination] Session validation failed:",
        validation.error
      )
      return {
        orders: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        pageSize: limit,
        hasNextPage: false,
        hasPreviousPage: false,
      }
    }

    const result = await runIdentityCall("listOrdersWithPagination", {
      v1: (bearer) => v1OrdersPage(bearer, limit, offset, searchText),
      graphql: () =>
        sdk.customer.getCustomerOrders({
          take: limit,
          skip: offset,
          searchText: searchText || undefined,
        }),
      guest: () => emptyOrdersPage(limit),
      onError: () => emptyOrdersPage(limit),
    })

    // set order display_id
    result.orders.forEach((order) => {
      order.display_id = order.order_external_code || order.order_code
    })

    console.log("[listOrdersWithPagination] Orders retrieved successfully:", {
      ordersCount: result.orders.length,
      totalCount: result.totalCount,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
    })

    return result
  } catch (error) {
    console.error("[listOrdersWithPagination] Error fetching orders:", error)
    return {
      orders: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      pageSize: limit,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  }
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  // TODO: Implement with GraphQL when transfer request mutation is available
  console.log("createTransferRequest not yet implemented with GraphQL")
  return { success: false, error: "Not implemented", order: null }
}

export const acceptTransferRequest = async (id: string, token: string) => {
  // TODO: Implement with GraphQL when transfer accept mutation is available
  console.log("acceptTransferRequest not yet implemented with GraphQL")
  return { success: false, error: "Not implemented", order: null }
}

export const declineTransferRequest = async (id: string, token: string) => {
  // TODO: Implement with GraphQL when transfer decline mutation is available
  console.log("declineTransferRequest not yet implemented with GraphQL")
  return { success: false, error: "Not implemented", order: null }
}
