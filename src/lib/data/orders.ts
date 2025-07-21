"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { Order } from "@lib/furnisystems-sdk/modules/customer/types"

export const retrieveOrder = async (id: string) => {
  // TODO: Implement with GraphQL when single order query is available
  // For now, return null to avoid breaking the app
  console.log("retrieveOrder not yet implemented with GraphQL")
  return null
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
): Promise<Order[]> => {
  const authHeaders = await getAuthHeaders()

  // Return empty array if user is not authenticated
  if (!authHeaders || !("authorization" in authHeaders)) {
    return []
  }

  try {
    // Set the auth headers on the SDK client before making the request
    sdk.setAuthHeaders(authHeaders)

    // Use the furnisystems SDK to get customer orders via GraphQL
    const orders = await sdk.customer.getCustomerOrders()

    // set order display_id
    orders.forEach((order) => {
      order.display_id = order.order_external_code || order.order_code
    })

    return orders
  } catch (error) {
    console.error("Error fetching orders:", error)
    return []
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
