/**
 * JWT utility functions that work in both server and client environments
 */

/**
 * Decodes JWT payload (works in both server and client environments)
 */
function decodeJWTPayload(token: string): any {
  try {
    // Use Buffer for server-side, atob for client-side
    if (typeof window === "undefined") {
      // Server-side: use Buffer
      return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
    } else {
      // Client-side: use atob
      return JSON.parse(atob(token.split(".")[1]))
    }
  } catch (error) {
    console.error("[decodeJWTPayload] Error decoding token:", error)
    return null
  }
}

/**
 * Checks if a JWT token is expired (works in both server and client environments)
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJWTPayload(token)

    if (!payload) {
      return true
    }

    const currentTime = Math.floor(Date.now() / 1000)

    // Check if token has expired
    if (payload.exp && payload.exp < currentTime) {
      console.log("[isTokenExpired] Token is expired", {
        exp: payload.exp,
        current: currentTime,
        expired: payload.exp < currentTime,
      })
      return true
    }

    return false
  } catch (error) {
    console.error("[isTokenExpired] Error checking token expiration:", error)
    // If we can't decode the token, consider it invalid
    return true
  }
}

/**
 * Extracts customer_accountId from a JWT token
 */
export function getCustomerAccountIdFromToken(token: string): string | null {
  try {
    const payload = decodeJWTPayload(token)

    if (!payload) {
      console.log(
        "[getCustomerAccountIdFromToken] Could not decode token payload"
      )
      return null
    }

    const customerId = payload.customer_accountId

    if (!customerId) {
      console.log(
        "[getCustomerAccountIdFromToken] No customer_accountId found in token"
      )
      return null
    }

    console.log(
      "[getCustomerAccountIdFromToken] Extracted customer_accountId:",
      customerId
    )
    return customerId
  } catch (error) {
    console.error(
      "[getCustomerAccountIdFromToken] Error extracting customer ID:",
      error
    )
    return null
  }
}

/**
 * Extracts managerId from a JWT token. Set ONLY when the session originated
 * from the admin app's "Impersonate B2B Portal" action. Returns null otherwise.
 */
export function getManagerIdFromToken(token: string): number | null {
  try {
    const payload = decodeJWTPayload(token)
    if (!payload) return null
    const id = payload.managerId
    if (id == null) return null
    const n = Number(id)
    return Number.isFinite(n) ? n : null
  } catch (error) {
    console.error("[getManagerIdFromToken] Error extracting managerId:", error)
    return null
  }
}

/**
 * Extracts the customer role from a JWT token (e.g. 'admin', 'agent', or null).
 */
export function getRoleFromToken(token: string): string | null {
  try {
    const payload = decodeJWTPayload(token)
    if (!payload) return null
    return typeof payload.role === 'string' ? payload.role : null
  } catch (error) {
    console.error("[getRoleFromToken] Error extracting role:", error)
    return null
  }
}

/**
 * Validates token and extracts customer info in one call
 */
export function validateTokenAndExtractCustomerId(token: string): {
  isValid: boolean
  isExpired: boolean
  customerId: string | null
} {
  try {
    const payload = decodeJWTPayload(token)

    if (!payload) {
      return { isValid: false, isExpired: true, customerId: null }
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const isExpired = payload.exp && payload.exp < currentTime
    const customerId = payload.customer_accountId || null

    return {
      isValid: !isExpired,
      isExpired: !!isExpired,
      customerId,
    }
  } catch (error) {
    console.error("[validateTokenAndExtractCustomerId] Error:", error)
    return { isValid: false, isExpired: true, customerId: null }
  }
}
