"use server"

import { setAuthToken, setCacheId } from "@lib/data/cookies"
import { sdk } from "@lib/config"
import { getShopSettings } from "@lib/data/shop-settings"
import { listMenuCategories } from "@lib/data/categories"
import { getFirstCategoryUrl } from "@lib/util/first-category-href"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { getImpersonationClaims, isTokenExpired } from "@lib/util/jwt-utils"

// Asks the backend which customer the token authenticates as, sending the
// token itself as the Bearer credential. A direct fetch, not
// sdk.customer.getMe(): the SDK's auth link always sends the existing
// `_furni_jwt` cookie (the admin may already hold another session), and
// sdk.setAuthHeaders() would mutate the singleton shared by concurrent
// requests. Returns null when the backend rejects the token (bad signature,
// expired, retired shape, unknown customer).
async function getBackendCustomerId(token: string): Promise<number | null> {
  const endpoint = process.env.NEXT_PUBLIC_BACKEND_GRAPHQL
  if (!endpoint) {
    console.error("[Impersonate] NEXT_PUBLIC_BACKEND_GRAPHQL is not configured")
    return null
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-client": "portal",
    },
    body: JSON.stringify({ query: "query { getMe { id } }" }),
    cache: "no-store",
  })
  if (!response.ok) {
    return null
  }

  const json = await response.json()
  const id = json?.data?.getMe?.id
  if (id == null) {
    return null
  }
  const customerId = Number(id)
  return Number.isFinite(customerId) ? customerId : null
}

export async function impersonateLoginAction(
  _currentState: unknown,
  formData: FormData
) {
  const token = formData.get("token") as string
  const languageCode = formData.get("languageCode") as string

  if (!token) {
    redirect(`/${languageCode}/account`)
    return
  }

  // Validate the token structure and expiration before storing
  if (isTokenExpired(token)) {
    console.error("[Impersonate] Token is expired or invalid")
    redirect(`/${languageCode}/account`)
    return
  }

  // Only an admin impersonation token may land here: managerId set,
  // customer_accountId null, customerId present. Never log the token or its
  // payload - the payload embeds a usable nested session JWT (userToken).
  const claims = getImpersonationClaims(token)
  if (!claims) {
    console.error("[Impersonate] Token is not an impersonation token")
    redirect(`/${languageCode}/account`)
    return
  }

  // Decoding proves nothing about the signature: have the backend verify the
  // token and confirm it authenticates as the customer it claims.
  let verified = false
  try {
    const backendCustomerId = await getBackendCustomerId(token)
    verified = backendCustomerId === claims.customerId
  } catch (error: any) {
    console.error(
      "[Impersonate] Backend token validation failed:",
      error?.message ?? "Unknown error"
    )
  }

  if (!verified) {
    console.error("[Impersonate] Backend rejected the impersonation token")
    redirect(`/${languageCode}/account`)
    return
  }

  let loggedIn = false
  try {
    // The token is a backend-verified impersonation session JWT;
    // store it as the session cookie
    await setAuthToken(token)

    // Generate a new cache ID to force fresh data
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)

    // Clear all customer-related cache tags to force fresh data
    revalidateTag("customers")

    // Clear Apollo cache
    sdk.clearCache()

    loggedIn = true
    console.log(
      "[Impersonate] Admin impersonation login successful, redirecting to store"
    )
  } catch (error: any) {
    console.error("[Impersonate] Impersonation login failed:", error)
  }

  // Land on the first Store category; any failure degrades to /account so
  // impersonation never breaks. redirect() throws, so it stays outside the try.
  let target = `/${languageCode}/account`
  if (loggedIn) {
    try {
      const [shopSettings, categories] = await Promise.all([
        getShopSettings(),
        listMenuCategories(languageCode),
      ])
      target = getFirstCategoryUrl(
        shopSettings?.navigation_items,
        categories,
        languageCode
      )
    } catch (error) {
      console.error("[Impersonate] Could not resolve landing category:", error)
    }
  }

  redirect(target)
}
