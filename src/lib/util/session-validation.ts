"use server"

import { sdk } from "@lib/config"
import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { removeAuthToken, removeCacheId, setCacheId } from "@lib/data/cookies"
import { isTokenExpired } from "./jwt-utils"

/**
 * Validates the current session by checking JWT token and attempting to fetch customer data
 */
export async function validateSession(): Promise<{
  isValid: boolean
  customer: any | null
  error?: string
}> {
  console.log("[validateSession] Starting session validation...")

  try {
    // Check if JWT token exists
    const cookieStore = await cookies()
    const jwtToken = cookieStore.get("_furni_jwt")?.value

    if (!jwtToken) {
      console.log("[validateSession] No JWT token found")
      return { isValid: false, customer: null, error: "No token" }
    }

    // Check if token is expired (client-side check)
    if (isTokenExpired(jwtToken)) {
      console.log("[validateSession] JWT token is expired")
      await cleanupInvalidSession()
      return { isValid: false, customer: null, error: "Token expired" }
    }

    // Attempt to fetch customer data to validate token with backend
    console.log("[validateSession] Attempting to fetch customer data...")
    const customer = await sdk.customer.getMe()

    if (!customer) {
      console.log("[validateSession] No customer data returned")
      await cleanupInvalidSession()
      return { isValid: false, customer: null, error: "No customer data" }
    }

    console.log("[validateSession] Session is valid, customer found:", {
      id: customer.id,
      email: customer.email,
    })

    return { isValid: true, customer }
  } catch (error: any) {
    console.log("[validateSession] Session validation failed:", error.message)

    // If authentication error, clean up invalid session
    if (
      error.message?.includes("not authenticated") ||
      error.message?.includes("unauthorized") ||
      error.message?.includes("invalid token") ||
      error.status === 401 ||
      error.status === 403
    ) {
      await cleanupInvalidSession()
    }

    return { isValid: false, customer: null, error: error.message }
  }
}

/**
 * Cleans up invalid session by removing tokens and clearing cache
 */
export async function cleanupInvalidSession(): Promise<void> {
  console.log("[cleanupInvalidSession] Cleaning up invalid session...")

  try {
    // Clear auth headers from the SDK client
    sdk.clearAuthHeaders()

    // Clear Apollo cache to remove any cached data
    sdk.clearCache()

    // Remove auth token from cookies
    await removeAuthToken()

    // Generate a new cache ID to invalidate cached data
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)

    // Revalidate customer cache
    revalidateTag("customers")
    revalidateTag("carts")

    console.log("[cleanupInvalidSession] Session cleanup completed")
  } catch (error) {
    console.error("[cleanupInvalidSession] Error during cleanup:", error)
  }
}

/**
 * Enhanced auth headers getter with validation
 */
export async function getValidatedAuthHeaders(): Promise<
  Record<string, string>
> {
  const validation = await validateSession()

  if (!validation.isValid) {
    throw new Error("Invalid session")
  }

  const cookieStore = await cookies()
  const jwtToken = cookieStore.get("_furni_jwt")?.value

  if (!jwtToken) {
    throw new Error("No auth token")
  }

  return {
    Authorization: `Bearer ${jwtToken}`,
  }
}
