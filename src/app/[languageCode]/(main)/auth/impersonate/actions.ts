"use server"

import { setAuthToken, setCacheId } from "@lib/data/cookies"
import { sdk } from "@lib/config"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { isTokenExpired } from "@lib/util/jwt-utils"

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

  try {
    // The impersonation token is already a valid auth JWT
    // Just store it directly as the session cookie
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

    console.log(
      "[Impersonate] Admin impersonation login successful, redirecting to account"
    )
  } catch (error: any) {
    console.error("[Impersonate] Impersonation login failed:", error)
  }

  redirect(`/${languageCode}/account`)
}
