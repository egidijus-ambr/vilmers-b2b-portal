"use server"

import { sdk } from "@lib/config"
import { GET_ADDITIONAL_ADDRESS, CREATE_ORDER, GET_PAYMENT_METHOD } from "@modules/checkout/queries/checkout-queries"

export async function fetchCustomerAddresses(customerId: number) {
  try {
    const result = await sdk.getApolloClient().query({
      query: GET_ADDITIONAL_ADDRESS,
      variables: { customerId },
      fetchPolicy: "network-only",
    })
    return result.data?.getAddresses?.addresses ?? []
  } catch (err: any) {
    console.error("Failed to fetch addresses:", err)
    return []
  }
}

export async function fetchDefaultPaymentMethod(): Promise<number | null> {
  try {
    const result = await sdk.getApolloClient().query({
      query: GET_PAYMENT_METHOD,
      fetchPolicy: "network-only",
    })
    const methods = result.data?.findManyPaymentMethod
    return methods?.[0]?.id ?? null
  } catch (err: any) {
    console.error("Failed to fetch payment method:", err)
    return null
  }
}

export async function placeOrder(variables: Record<string, any>) {
  try {
    console.log("[placeOrder] purchased_by:", JSON.stringify(variables.purchased_by))
    const result = await sdk.getApolloClient().mutate({
      mutation: CREATE_ORDER,
      variables,
    })
    const orderId = result.data?.createNewOrder?.id
    if (!orderId) {
      return { success: false, error: "No order ID returned" }
    }
    return { success: true, orderId }
  } catch (err: any) {
    console.error("Failed to place order:", err)
    return { success: false, error: err.message || "Failed to place order" }
  }
}
