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
import { getCountryCodeFromLanguage } from "@lib/util/language-mapping"
import { ErrorHandlers } from "@lib/util/error-handler"

export const retrieveCustomer = async (): Promise<
  | (HttpTypes.StoreCustomer & {
      full_name?: string
      managers?: any[]
      spoken_languages?: string[]
      is_configurator_enabled?: boolean
      is_claims_enabled?: boolean
    })
  | null
> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders || !("authorization" in authHeaders)) {
    return null
  }

  try {
    // Set the auth headers on the SDK client before making the request
    sdk.setAuthHeaders(authHeaders)

    const customer = await sdk.customer.getMe()

    if (!customer) {
      console.log("No customer data returned from SDK")
      return null
    }

    // Map Customer to StoreCustomer with full_name and managers extension
    const storeCustomer: HttpTypes.StoreCustomer & {
      full_name?: string
      managers?: any[]
      spoken_languages?: string[]
      is_configurator_enabled?: boolean
      is_claims_enabled?: boolean
    } = {
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
      managers: customer.managers || [],
      spoken_languages: customer.spoken_languages || [],
      is_configurator_enabled: customer.is_configurator_enabled || false,
      is_claims_enabled: customer.is_claims_enabled || false,
    }

    return storeCustomer
  } catch (error) {
    console.error("Error retrieving customer:", error)
    // Clear auth headers from SDK if authentication fails
    sdk.clearAuthHeaders()
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
    return ErrorHandlers.login(error)
  }

  try {
    await transferCart()
  } catch (error: any) {
    console.error("Cart transfer error:", error)
    const { handleError } = await import("@lib/util/error-handler")
    return handleError(error, "cart transfer")
  }

  // Redirect to account dashboard after successful login
  redirect("/lt/account")
}

export async function signout(languageCode: string) {
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

    // Generate a new cache ID instead of removing it to avoid middleware redirect loop
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)

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
  redirect(`/${languageCode}/account`)
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

export const getStoreLoginLink = async (): Promise<string> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders || !("authorization" in authHeaders)) {
    throw new Error("Not authenticated")
  }

  try {
    // Set the auth headers on the SDK client before making the request
    sdk.setAuthHeaders(authHeaders)

    // Call the SDK method to get the store login link
    const storeUrl = await sdk.customer.getStoreLoginLink()

    return storeUrl
  } catch (error) {
    console.error("Error getting store login link:", error)
    throw error
  }
}

export async function requestMagicLink(
  _currentState: unknown,
  formData: FormData
) {
  // Wrap everything in a top-level try-catch to prevent any uncaught exceptions
  try {
    const email = formData.get("email") as string

    if (!email) {
      return "Email is required"
    }

    // Get the current language from the form data or use a default
    const language = (formData.get("language") as string) || "en"

    try {
      const result = await sdk.customer.getMagicLinkForB2BCustomer(
        email,
        language
      )

      console.log("Magic link request successful:", result)
      return { success: true, message: "Magic link sent successfully" }
    } catch (sdkError: any) {
      // For security reasons, if user doesn't exist, we still show success message
      // This prevents email enumeration attacks
      if (
        sdkError?.message?.includes("There is no such user!") ||
        sdkError?.message?.includes("no such user") ||
        sdkError?.message?.includes("user not found") ||
        sdkError?.message?.includes("not found") ||
        sdkError?.status === 404
      ) {
        console.log("User not found, returning success for security")
        return { success: true, message: "Magic link sent successfully" }
      }

      // For rate limiting errors, return a user-friendly message
      if (
        sdkError?.message?.includes("Too many") ||
        sdkError?.message?.includes("rate limit") ||
        sdkError?.message?.includes("Try again after")
      ) {
        console.log("Rate limit error, returning user-friendly message")
        return "Too many requests. Please wait a moment and try again."
      }

      // For all other errors, return a generic error message
      console.log("Other SDK error, returning generic message")
      return "Service is currently unavailable. Please try again later."
    }
  } catch (error: any) {
    // This is the ultimate fallback to prevent any uncaught exceptions
    console.error("Top-level catch - preventing uncaught exception:", error)
    return "Service is currently unavailable. Please try again later."
  }
}

export async function verifyMagicLinkAction(
  _currentState: unknown,
  formData: FormData
) {
  const token = formData.get("token") as string
  const languageCode = formData.get("languageCode") as string

  console.log("Verifying magic link with token:", token)

  try {
    const authToken = await sdk.customer.verifyMagicLink(token)

    console.log("Magic link verification successful, received token")

    await setAuthToken(authToken)

    // Generate a new cache ID for this user session
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)

    // Clear all customer-related cache tags to force fresh data
    revalidateTag("customers")

    // Also clear the specific cache tag if it exists
    const customerCacheTag = await getCacheTag("customers")
    if (customerCacheTag) {
      revalidateTag(customerCacheTag)
    }

    // Clear Apollo cache to remove any cached data
    sdk.clearCache()

    // Transfer cart if needed
    try {
      await transferCart()
    } catch (error: any) {
      console.error("Cart transfer error:", error)
    }

    console.log(
      "Magic link login successful, cache cleared, redirecting to account"
    )
  } catch (error: any) {
    console.error("Magic link verification error:", error)
    // Don't throw error - we'll redirect to account page anyway
  }

  // Always redirect to account page regardless of success/failure
  redirect(`/${languageCode}/account`)
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
