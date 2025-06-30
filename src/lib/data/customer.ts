"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  removeCacheId,
  setAuthToken,
  setCacheId,
} from "./cookies"

export const retrieveCustomer = async (): Promise<
  (HttpTypes.StoreCustomer & { full_name?: string }) | null
> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders || !("authorization" in authHeaders)) return null

  const cacheOptions = await getCacheOptions("customers")

  try {
    console.log("Retrieving customer with auth headers:", authHeaders)

    // Set the auth headers on the SDK client before making the request
    sdk.setAuthHeaders(authHeaders)

    const customer = await sdk.customer.getMe()
    console.log("Retrieved customer:", customer)

    if (!customer) return null

    // Map Customer to StoreCustomer with full_name extension
    const storeCustomer: HttpTypes.StoreCustomer & { full_name?: string } = {
      id: customer.id,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      email: customer.email,
      first_name: customer.full_name || null,
      last_name: null,
      full_name: customer.full_name,
      default_billing_address_id: null,
      default_shipping_address_id: null,
      company_name: null,
      addresses: [],
    }

    return storeCustomer
  } catch (error) {
    console.error("Error retrieving customer:", error)
    return null
  }
}

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  // const headers = {
  //   ...(await getAuthHeaders()),
  // }
  // const updateRes = await sdk.store.customer
  //   .update(body, {}, headers)
  //   .then(({ customer }) => customer)
  //   .catch(medusaError)
  // const cacheTag = await getCacheTag("customers")
  // revalidateTag(cacheTag)
  // return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    full_name: formData.get("full_name") as string,
    phone: formData.get("phone") as string,
  }

  // try {
  //   const token = await sdk.auth.register("customer", "emailpass", {
  //     email: customerForm.email,
  //     password: password,
  //   })

  //   await setAuthToken(token as string)

  //   const headers = {
  //     ...(await getAuthHeaders()),
  //   }

  //   const { customer: createdCustomer } = await sdk.store.customer.create(
  //     customerForm,
  //     {},
  //     headers
  //   )

  //   const loginToken = await sdk.auth.login("customer", "emailpass", {
  //     email: customerForm.email,
  //     password,
  //   })

  //   await setAuthToken(loginToken as string)

  //   const customerCacheTag = await getCacheTag("customers")
  //   revalidateTag(customerCacheTag)

  //   await transferCart()

  //   return createdCustomer
  // } catch (error: any) {
  //   return error.toString()
  // }
}

export async function login(_currentState: unknown, formData: FormData) {
  console.log("Logging in...")
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  console.log("Logging in with email:", email)

  try {
    const result = await sdk.customer.login({
      email,
      password,
    })

    console.log("Login result:", result)

    await setAuthToken(result.token)

    // Generate a new cache ID for this user session
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
  } catch (error: any) {
    console.error("Login error:", error)
    return error.toString()
  }

  try {
    await transferCart()
  } catch (error: any) {
    console.error("Cart transfer error:", error)
    return error.toString()
  }

  // Redirect to account dashboard after successful login
  redirect("/lt/account")
}

export async function signout(countryCode: string) {
  try {
    // Get cache tags before removing cache ID
    const customerCacheTag = await getCacheTag("customers")
    const cartCacheTag = await getCacheTag("carts")

    // Logout from the SDK
    await sdk.customer.logout()

    // Clear auth headers from the SDK client
    sdk.clearAuthHeaders()

    // Clear Apollo cache to remove any cached data
    sdk.clearCache()

    // Remove auth token from cookies
    await removeAuthToken()

    // Remove cart ID from cookies
    await removeCartId()

    // Remove cache ID from cookies to invalidate all cached data
    await removeCacheId()

    // Revalidate customer cache
    if (customerCacheTag) {
      revalidateTag(customerCacheTag)
    }

    // Revalidate cart cache
    if (cartCacheTag) {
      revalidateTag(cartCacheTag)
    }

    // Also revalidate generic tags to ensure complete cache invalidation
    revalidateTag("customers")
    revalidateTag("carts")

    console.log("User logged out successfully")
  } catch (error) {
    console.error("Error during logout:", error)
  }

  // Redirect to account page (login page)
  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  // const cartId = await getCartId()
  // if (!cartId) {
  //   return
  // }
  // const headers = await getAuthHeaders()
  // await sdk.store.cart.transferCart(cartId, {}, headers)
  // const cartCacheTag = await getCacheTag("carts")
  // revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    full_name: formData.get("full_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  // return sdk.store.customer
  //   .createAddress(address, {}, headers)
  //   .then(async ({ customer }) => {
  //     const customerCacheTag = await getCacheTag("customers")
  //     revalidateTag(customerCacheTag)
  //     return { success: true, error: null }
  //   })
  //   .catch((err) => {
  //     return { success: false, error: err.toString() }
  //   })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  // await sdk.store.customer
  //   .deleteAddress(addressId, headers)
  //   .then(async () => {
  //     const customerCacheTag = await getCacheTag("customers")
  //     revalidateTag(customerCacheTag)
  //     return { success: true, error: null }
  //   })
  //   .catch((err) => {
  //     return { success: false, error: err.toString() }
  //   })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    full_name: formData.get("full_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  // return sdk.store.customer
  //   .updateAddress(addressId, address, {}, headers)
  //   .then(async () => {
  //     const customerCacheTag = await getCacheTag("customers")
  //     revalidateTag(customerCacheTag)
  //     return { success: true, error: null }
  //   })
  //   .catch((err) => {
  //     return { success: false, error: err.toString() }
  //   })
}
