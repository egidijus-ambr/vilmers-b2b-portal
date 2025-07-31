/**
 * JWT utility functions that work in both server and client environments
 */

/**
 * Checks if a JWT token is expired (works in both server and client environments)
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decode JWT payload (without verification, just for expiration check)
    // Use Buffer for server-side, atob for client-side
    let payload: any
    if (typeof window === "undefined") {
      // Server-side: use Buffer
      payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      )
    } else {
      // Client-side: use atob
      payload = JSON.parse(atob(token.split(".")[1]))
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
