"use server"

import { sdk } from "@lib/config"
import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { removeAuthToken, removeCacheId, setCacheId } from "@lib/data/cookies"
import { isTokenExpired, getCustomerAccountIdFromToken } from "./jwt-utils"
import { AuthenticationError } from "@lib/furnisystems-sdk/client/errors"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { mapV1MeToCustomer } from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { getV1RequestContext } from "@lib/data/v1-transport"
import { describeV1Error, v1GetMeSelf } from "@lib/data/me-v1"

// Classification lives on the thrown error from sdk.customer.getMe() (see its
// isAuthGraphQLError helper). We check both `instanceof` and the error's own `code` field:
// `@lib/config` (and therefore the SDK's error classes) is reachable from both the
// server/action graph and the client bundle graph, so a duplicate module instance could make
// `instanceof` silently false without the `code` fallback.
function isAuthenticationFailure(error: any): boolean {
  return (
    error instanceof AuthenticationError ||
    error?.code === "AUTHENTICATION_ERROR"
  )
}

/**
 * Validates the current session by checking JWT token and attempting to fetch customer data
 */
export async function validateSession(): Promise<{
  isValid: boolean
  customer: any | null
  customerId: string | null
  error?: string
}> {
  try {
    // Check if JWT token exists
    const cookieStore = await cookies()
    const jwtToken = cookieStore.get("_furni_jwt")?.value

    if (!jwtToken) {
      return {
        isValid: false,
        customer: null,
        customerId: null,
        error: "No token",
      }
    }

    // Extract customer ID from token for comparison
    const customerId = getCustomerAccountIdFromToken(jwtToken)

    // Check if token is expired (client-side check)
    if (isTokenExpired(jwtToken)) {
      await cleanupInvalidSession()
      return {
        isValid: false,
        customer: null,
        customerId,
        error: "Token expired",
      }
    }

    // REST v1 (portal REST slice 7 / 2c-10) when this request has a usable
    // v1 access token (src/lib/data/v1-transport-rule.ts): GET /me WITHOUT
    // X-Acting-Customer-Id is the caller itself, as GraphQL getMe was.
    //   2xx  -> valid (memoised per request, never in a shared cache)
    //   401  -> this one call takes the GraphQL getMe path below
    //   else -> logged-out for this render, NO cookie is touched (a 403 /
    //           404 / 429 / 5xx never ends the session; the middleware's
    //           refresh decides that)
    const transport = await getV1RequestContext()
    if (transport.identity === "v1" && transport.bearer) {
      try {
        const me = await v1GetMeSelf(transport.bearer)
        return { isValid: true, customer: mapV1MeToCustomer(me), customerId }
      } catch (v1Error) {
        if (!(isV1ProblemError(v1Error) && v1Error.status === 401)) {
          console.warn(
            `[validateSession] v1 /me failed, session preserved: ${describeV1Error(v1Error)}`
          )
          return {
            isValid: false,
            customer: null,
            customerId,
            error: "v1 /me failed",
          }
        }
        console.warn("[validateSession] v1 /me answered 401, using GraphQL getMe")
      }
    }

    // GraphQL path (legacy-only sessions; see v1-transport-rule.ts).
    // Attempt to fetch customer data to validate token with backend
    try {
      const customer = await sdk.customer.getMe()

      if (!customer) {
        // getMe() resolved with no data and no classified error (e.g. the resolver
        // legitimately returned nothing). This is deliberately NOT treated as a genuine
        // auth failure, so we do NOT clean up the session here - doing so previously
        // destroyed valid sessions on any transient getMe() hiccup (network blip, timeout,
        // unrelated resolver error), because every failure was swallowed to `null` before
        // reaching this point. See getMe()'s own auth-vs-transient classification instead.
        return {
          isValid: false,
          customer: null,
          customerId,
          error: "No customer data",
        }
      }

      return { isValid: true, customer, customerId }
    } catch (getMeError: any) {
      if (isAuthenticationFailure(getMeError)) {
        // Genuine auth failure (expired/invalid/malformed token, unauthenticated resolver) -
        // the session really is invalid, so tear it down.
        await cleanupInvalidSession()
        return {
          isValid: false,
          customer: null,
          customerId,
          error: getMeError.message,
        }
      }

      // Transient failure (network blip, timeout, unrelated resolver error with no data).
      // The token may still be valid, so do NOT remove the cookie or clear the Apollo cache
      // here - just report this render as logged-out and let the next request retry.
      console.warn(
        `[validateSession] Transient getMe() failure, preserving session: ${getMeError?.message}`
      )

      return {
        isValid: false,
        customer: null,
        customerId,
        error: getMeError?.message ?? "Unknown error",
      }
    }
  } catch (error: any) {
    // Unexpected failure outside of the getMe() call above (e.g. cookie access outside of
    // request scope). Not a classified auth failure, so don't attempt cleanup.
    console.warn(
      `[validateSession] Unexpected error, preserving session: ${error?.message}`
    )

    return {
      isValid: false,
      customer: null,
      customerId: null,
      error: error?.message,
    }
  }
}

/**
 * Cleans up invalid session by removing tokens and clearing cache
 */
export async function cleanupInvalidSession(): Promise<void> {
  // Clear auth headers from the SDK client
  sdk.clearAuthHeaders()

  // Clear Apollo cache to remove any cached data
  sdk.clearCache()

  // Cookie modifications may fail during Server Component rendering
  // (only allowed in Server Actions / Route Handlers), so wrap individually
  try {
    await removeAuthToken()
  } catch {
    // Cannot modify cookies during render — token will expire naturally
  }

  try {
    const newCacheId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`
    await setCacheId(newCacheId)
  } catch {
    // Cannot modify cookies during render
  }

  try {
    revalidateTag("customers")
    revalidateTag("carts")
  } catch {
    // Revalidation may fail outside of request context
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
