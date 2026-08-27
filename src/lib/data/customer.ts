"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag, unstable_cache, unstable_noStore } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
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
import { ErrorHandlers } from "@lib/util/error-handler"
import { validateSession } from "@lib/util/session-validation"
import { validateTokenAndExtractCustomerId } from "@lib/util/jwt-utils"
import { ExtendedStoreCustomer } from "@lib/types/customer"
import { getDefaultPriceListId } from "./default-pricelist"
import { getAnonymousProductTagIds } from "./anonymous-product-tags"
import { getActingCustomer } from "./acting-customer"
import { getShowAllProductsActive } from "./show-all-products"
import { getPageByCode } from "./pages"
import { Page } from "@lib/furnisystems-sdk"

export const retrieveCustomer =
  async (): Promise<ExtendedStoreCustomer | null> => {
    // Prevent caching for authentication-related data
    unstable_noStore()

    try {
      // Use the new session validation system
      const validation = await validateSession()

      if (!validation.isValid) {
        return null
      }

      const customer = validation.customer

      if (!customer) {
        return null
      }

      return customer
    } catch (error) {
      console.log(
        "[retrieveCustomer] Error during customer retrieval:",
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

/**
 * Server action wrapper around `getPageByCode` for the "login" CMS page,
 * so client components (e.g. the account layout) can fetch it without
 * importing the server-only `pages.ts` helpers directly.
 */
export const getLoginPage = async (language?: string): Promise<Page | null> => {
  return getPageByCode("login", language)
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

    // SDK handles token storage internally, just manage cache
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

  // Redirect to home page after logout
  redirect(`/${languageCode}`)
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

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  throw new Error("updateCustomerAddress is not implemented yet")
  // return sdk.store.customer
  //   .updateAddress(address, {}, headers)
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
  try {
    // SDK automatically handles authentication from cookies
    const storeUrl = await sdk.customer.getStoreLoginLink()
    return storeUrl
  } catch (error) {
    console.error("Error getting store login link:", error)
    throw error
  }
}

export const getClaimsLink = async (language: string): Promise<string> => {
  try {
    // SDK automatically handles authentication from cookies
    const claimsUrl = await sdk.customer.getClaimsLink(language)
    return claimsUrl
  } catch (error) {
    console.error("Error getting claims link:", error)
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

    // Extract IP address from request headers
    const headersList = await headers()
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      headersList.get("x-client-ip") ||
      headersList.get("cf-connecting-ip") ||
      headersList.get("remote-addr") ||
      "unknown"

    console.log("Magic link request from IP:", ipAddress)

    try {
      const result = await sdk.customer.getMagicLinkForB2BCustomer(
        email,
        language,
        ipAddress
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

  // Check existing session state
  const existingSessionValidation = await validateSession()
  console.log("[Magic Link] Existing session status:", {
    isValid: existingSessionValidation.isValid,
    customerId: existingSessionValidation.customerId,
    error: existingSessionValidation.error,
  })

  // Validate and extract customer ID from magic link token
  const tokenInfo = validateTokenAndExtractCustomerId(token)
  console.log("[Magic Link] Token validation:", {
    isValid: tokenInfo.isValid,
    isExpired: tokenInfo.isExpired,
    customerId: tokenInfo.customerId,
  })

  // Decision matrix based on session state, token state, and customer ID comparison
  if (existingSessionValidation.isValid) {
    // Existing session is valid
    if (tokenInfo.isValid) {
      // Token is valid
      if (
        existingSessionValidation.customerId === tokenInfo.customerId &&
        tokenInfo.customerId
      ) {
        // Scenario 1: Valid session + Valid token + Same customer ID → Keep existing session
        console.log(
          "[Magic Link] Scenario 1: Same customer with valid token - keeping existing session"
        )
        redirect(`/${languageCode}/account`)
        return
      } else {
        // Scenario 2: Valid session + Valid token + Different customer ID → Switch to new user
        console.log(
          "[Magic Link] Scenario 2: Different customer with valid token - switching users"
        )
        await performMagicLinkLogin(token, languageCode)
        return
      }
    } else {
      // Token is expired/invalid
      if (
        existingSessionValidation.customerId === tokenInfo.customerId &&
        tokenInfo.customerId
      ) {
        // Scenario 3: Valid session + Expired token + Same customer ID → Keep existing session
        console.log(
          "[Magic Link] Scenario 3: Same customer with expired token - keeping existing session"
        )
        redirect(`/${languageCode}/account`)
        return
      } else {
        // Scenario 4: Valid session + Expired token + Different customer ID → Logout current user
        console.log(
          "[Magic Link] Scenario 4: Different customer with expired token - logging out current user"
        )
        await signout(languageCode)
        return
      }
    }
  } else {
    // No valid existing session
    if (tokenInfo.isValid) {
      // Scenario 5: Invalid session + Valid token → Login with token
      console.log(
        "[Magic Link] Scenario 5: No session with valid token - logging in"
      )
      await performMagicLinkLogin(token, languageCode)
      return
    } else {
      // Scenario 6: Invalid session + Expired token → Redirect without login
      console.log(
        "[Magic Link] Scenario 6: No session with expired token - redirecting without login"
      )
      redirect(`/${languageCode}/account`)
      return
    }
  }
}

/**
 * Performs the actual magic link login process
 */
async function performMagicLinkLogin(
  token: string,
  languageCode: string
): Promise<void> {
  try {
    console.log("[performMagicLinkLogin] Starting magic link verification...")

    // Verify the magic link token with the backend
    await sdk.customer.verifyMagicLink(token)

    console.log("[performMagicLinkLogin] Magic link verification successful")

    // SDK handles token storage internally, just manage cache
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
      console.error("[performMagicLinkLogin] Cart transfer error:", error)
    }

    console.log(
      "[performMagicLinkLogin] Magic link login successful, redirecting to account"
    )
  } catch (error: any) {
    console.error(
      "[performMagicLinkLogin] Magic link verification failed:",
      error
    )
    // Even if login fails, we still redirect to account page
  }

  redirect(`/${languageCode}/account`)
}

/**
 * Get the customer's product filter data (tags and price list IDs).
 * Used by product queries to filter results server-side.
 *
 * Decision table (top branch wins):
 *  1. getShowAllProductsActive() (admin-impersonator or Account Manager with
 *     the "All products" toggle on) → unrestricted: {undefined, []}.
 *  2. getActingCustomer() returns a customer:
 *       - end-customer session → this *is* the logged-in customer
 *         (getActingCustomer() passes them through as-is).
 *       - agent/admin session with a selected acting customer → this is the
 *         customer they're impersonating.
 *     Either way, filter strictly by that record's own tags/price lists.
 *     No fallback here — this reproduces the pre-existing behaviour for real
 *     customers exactly (e.g. a customer with no price list assigned keeps
 *     an intentionally empty priceListIds, not the shop default).
 *  3. No acting customer, but retrieveCustomer() still finds a logged-in
 *     session → this can only be an agent/admin who hasn't picked (or has a
 *     stale) acting-customer cookie, since real end-customers are already
 *     handled by branch 2. Use the agent/admin's own record (their own
 *     Price List / Tags configured in admin), falling back per-field to the
 *     anonymous defaults when their own record doesn't have one set.
 *  4. Nobody logged in at all (true guest) → anonymous product tags + the
 *     shop's default price list, same as today.
 */
export async function getCustomerFilterData(): Promise<{
  customerTagIds: number[] | undefined
  priceListIds: number[]
}> {
  // Privileged override: when an admin-impersonator or Account Manager has
  // ticked the "All products" checkbox, return an empty filter so the catalog
  // is unrestricted. The gate is enforced server-side inside
  // getShowAllProductsActive(), so a forged cookie on a non-privileged user
  // is inert.
  if (await getShowAllProductsActive()) {
    return { customerTagIds: undefined, priceListIds: [] }
  }

  let customer = null
  try {
    customer = await getActingCustomer()
  } catch {
    // Not authenticated — no filtering
  }

  if (customer) {
    // Branch 2: end-customer passthrough, or agent/admin with a selected
    // acting customer.
    const customerTagIds = customer?.tags?.map((t) => t.id) ?? []
    const groupPriceListId = customer?.group_price_listId ?? null
    const priceListIds = [
      ...(customer.price_listId ? [parseInt(customer.price_listId)] : []),
      ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
    ]
    return { customerTagIds, priceListIds }
  }

  // getActingCustomer() returned null. That covers true guests, but also a
  // logged-in agent/admin who hasn't picked an acting customer yet (or whose
  // acting-customer cookie is stale) — real end-customers never reach this
  // point (branch 2 already returned their own record). Re-check the raw
  // session to tell the two apart. retrieveCustomer() is cheap for guests —
  // validateSession() short-circuits on a missing JWT cookie with no network
  // call — so this only costs an extra request on the agent/admin path.
  let loggedInUser = null
  try {
    loggedInUser = await retrieveCustomer()
  } catch {
    // Not authenticated — no filtering
  }

  if (loggedInUser) {
    // Branch 3: agent/admin, logged in, no acting customer selected. Use
    // their own Price List / Tags from admin, falling back independently
    // per field to the same anonymous defaults a guest would get, since an
    // agent/admin's own record commonly has neither configured.
    const ownTagIds = loggedInUser.tags?.map((t) => t.id) ?? []
    const groupPriceListId = loggedInUser.group_price_listId ?? null
    const ownPriceListIds = [
      ...(loggedInUser.price_listId ? [parseInt(loggedInUser.price_listId)] : []),
      ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
    ]

    const customerTagIds =
      ownTagIds.length > 0 ? ownTagIds : await getAnonymousProductTagIds()
    const priceListIds =
      ownPriceListIds.length > 0
        ? ownPriceListIds
        : [await getDefaultPriceListId()]

    return { customerTagIds, priceListIds }
  }

  // Branch 4: true guest — not authenticated at all. Limited to the
  // anonymous product tags (opt-in — empty when unset, which reproduces
  // today's unfiltered behaviour exactly) and the shop's default price list.
  const [anonymousTagIds, defaultId] = await Promise.all([
    getAnonymousProductTagIds(),
    getDefaultPriceListId(),
  ])

  return { customerTagIds: anonymousTagIds, priceListIds: [defaultId] }
}

