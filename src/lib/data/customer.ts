"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag, unstable_cache, unstable_noStore } from "next/cache"
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
  setReturnToCookie,
  consumeReturnToCookie,
} from "./cookies"
import { validateSession } from "@lib/util/session-validation"
import { ExtendedStoreCustomer } from "@lib/types/customer"
import { getDefaultPriceListId } from "./default-pricelist"
import { getAnonymousProductTagIds } from "./anonymous-product-tags"
import { getActingCustomer } from "./acting-customer"
import { getShowAllProductsActive } from "./show-all-products"
import { getSessionCustomer } from "./session-customer"
import { getPageByCode } from "./pages"
import { Page } from "@lib/furnisystems-sdk"
import { normalizeLanguage } from "@lib/i18n/config"
import { v1SessionClient } from "@lib/v1-session/instance"
import {
  logoutV1SessionInAction,
  storeV1TokensInAction,
  v1RequestContextInAction,
} from "@lib/v1-session/server"
import {
  classifyMagicLinkToken,
  requestV1MagicLink,
  verifyV1MagicLink,
} from "@lib/v1-session/magic-link"

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

export async function signout(languageCode: string) {
  try {
    // Get cache tags before removing cache ID
    const customerCacheTag = await getCacheTag("customers")
    const cartCacheTag = await getCacheTag("carts")

    // End the v1 session of this browser (stage 2c-3, D5: this session only,
    // POST /auth/logout, never logout-all). Always clears both v1 cookies.
    try {
      await logoutV1SessionInAction()
    } catch (error) {
      console.warn(
        "[signout] v1 logout failed:",
        error instanceof Error ? error.name : "Unknown error"
      )
    }

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

/**
 * Login form action: requests a magic link on v1
 * (POST /api/v1/auth/magic-link/request through the BFF: x-bff-secret,
 * x-client-ip, user-agent). Returns `{ success: true }` or an i18n key.
 * The backend answers 202 for every address, so this never reveals whether
 * the email belongs to an account. Never logs the email.
 */
export async function requestMagicLink(
  _currentState: unknown,
  formData: FormData
): Promise<{ success: true } | string> {
  try {
    const email = String(formData.get("email") ?? "").trim()
    if (!email) {
      return "magic-link-request-email-required"
    }

    // Stash the page to return to after a successful login (e.g. a private
    // CMS page). No-op if missing/unsafe. Set before the send attempt so a
    // failed send + retry doesn't lose it.
    await setReturnToCookie(formData.get("returnTo") as string | null)

    const outcome = await requestV1MagicLink(
      v1SessionClient(),
      { email, language: formData.get("language") },
      await v1RequestContextInAction()
    )
    switch (outcome) {
      case "sent":
        return { success: true }
      case "rate-limited":
        return "magic-link-request-rate-limited"
      case "error":
        return "magic-link-request-error"
      default:
        return "magic-link-request-unavailable"
    }
  } catch (error) {
    console.error(
      "[magic-link] request action failed:",
      error instanceof Error ? error.name : "Unknown error"
    )
    return "magic-link-request-unavailable"
  }
}

export type MagicLinkVerifyState = {
  status: "expired" | "unavailable" | "error"
} | null

/**
 * Magic-link landing action, submitted automatically when the landing page
 * mounts. v1 links are reusable within their TTL, so a second open (mail
 * scanner, double click, already logged in) is harmless. The token's shape
 * decides the path (src/lib/v1-session/magic-link.ts):
 *   v1      -> POST /api/v1/auth/magic-link/verify. Success replaces the
 *              current session: the old v1 session (if any) is logged out,
 *              the new pair and its legacyToken (`_furni_jwt`) are stored.
 *   legacy  -> GraphQL verifyMagicLinkForB2BCustomer (links mailed before the
 *              deploy; removed in a later step). Success clears any v1
 *              cookies: this login has no v1 pair.
 *   other   -> "expired", no backend call.
 * A failed verify touches no session cookie: the current session, if any,
 * stays. If that session is valid the user is simply sent on to the
 * destination (an already-logged-in user never sees "expired" for reopening
 * a link); otherwise the state is returned for the page.
 */
export async function verifyMagicLinkAction(
  _currentState: unknown,
  formData: FormData
): Promise<MagicLinkVerifyState> {
  const token = String(formData.get("token") ?? "")
  const languageCode = normalizeLanguage(
    formData.get("languageCode") as string | null
  )

  const kind = classifyMagicLinkToken(token)
  if (kind === "invalid") {
    return failedVerifyState({ status: "expired" }, languageCode)
  }

  if (kind === "legacy") {
    let verified = false
    try {
      // The SDK stores the new `_furni_jwt` itself.
      await sdk.customer.verifyMagicLink(token)
      verified = true
    } catch {
      console.warn("[magic-link] legacy verify rejected or failed")
    }
    if (!verified) {
      return failedVerifyState({ status: "expired" }, languageCode)
    }
    // Invariant: v1 cookies, when present, belong to the same login as
    // `_furni_jwt`. A legacy login has no v1 pair: end the old one.
    await endV1SessionBeforeLogin()
    await refreshSessionCaches()
    redirect((await consumeReturnToCookie()) ?? `/${languageCode}/account`)
  }

  const outcome = await verifyV1MagicLink(
    v1SessionClient(),
    token,
    await v1RequestContextInAction()
  )
  if (outcome.kind !== "ok") {
    return failedVerifyState({ status: outcome.kind }, languageCode)
  }

  await endV1SessionBeforeLogin()
  await storeV1TokensInAction(outcome.tokens)
  await setAuthToken(outcome.tokens.legacyToken)
  await refreshSessionCaches()

  // redirect() throws: keep it outside any try/catch.
  redirect((await consumeReturnToCookie()) ?? `/${languageCode}/account`)
}

/**
 * A failed verify with a still-valid session (the link was reopened, or the
 * user is already logged in): go to the destination instead of an error
 * page. Without a valid session the state is returned for the page.
 * redirect() throws: it stays outside the try/catch.
 */
async function failedVerifyState(
  state: NonNullable<MagicLinkVerifyState>,
  languageCode: string
): Promise<MagicLinkVerifyState> {
  let loggedIn = false
  try {
    loggedIn = (await validateSession()).isValid
  } catch {
    loggedIn = false
  }
  if (!loggedIn) return state
  redirect((await consumeReturnToCookie()) ?? `/${languageCode}/account`)
}

/** Best-effort logout of the v1 session this browser had (D5: that one only). */
async function endV1SessionBeforeLogin(): Promise<void> {
  try {
    await logoutV1SessionInAction()
  } catch (error) {
    console.warn(
      "[magic-link] logout of the previous v1 session failed:",
      error instanceof Error ? error.name : "Unknown error"
    )
  }
}

/** A new login: new cache id, customer caches and the Apollo cache dropped. */
async function refreshSessionCaches(): Promise<void> {
  const newCacheId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  await setCacheId(newCacheId)
  revalidateTag("customers")
  const customerCacheTag = await getCacheTag("customers")
  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }
  sdk.clearCache()
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
    loggedInUser = await getSessionCustomer()
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

