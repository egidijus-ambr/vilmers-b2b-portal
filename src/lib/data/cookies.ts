import "server-only"
import { cookies as nextCookies } from "next/headers"
import { AUTH_COOKIE_MAX_AGE_SECONDS } from "@lib/auth-constants"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    console.log("[getAuthHeaders] Starting to retrieve auth headers...")
    const cookies = await nextCookies()
    console.log("[getAuthHeaders] Cookies object retrieved")

    const token = cookies.get("_furni_jwt")?.value
    console.log(
      "[getAuthHeaders] JWT token from cookies:",
      token ? "present" : "missing"
    )

    if (!token) {
      console.log("[getAuthHeaders] No JWT token found, returning empty object")
      return {}
    }

    console.log(
      "[getAuthHeaders] JWT token found, returning authorization header"
    )
    return { authorization: `Bearer ${token}` }
  } catch (error) {
    console.error("[getAuthHeaders] Error retrieving auth headers:", error)
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_furni_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_furni_jwt", token, {
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_furni_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_furni_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_furni_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_furni_cart_id", "", {
    maxAge: -1,
  })
}

const RETURN_TO_COOKIE = "_furni_return_to"
const RETURN_TO_MAX_AGE_SECONDS = 60 * 15 // 15 minutes - just long enough to read a magic-link email

// Same-site, path-only guard for post-login redirects: must be a local path
// ("/foo/bar"), never protocol-relative ("//evil.com", parsed by browsers as
// scheme-relative) or carrying a scheme/backslash that could be normalized
// into one. Shared by the setter and the consumer so both sides agree on
// what's safe.
function isSafeReturnPath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0) return false
  if (!path.startsWith("/")) return false
  if (path.startsWith("//")) return false
  if (path.includes("\\")) return false
  if (path.includes(":")) return false
  return true
}

// No-ops on an unsafe/missing path - callers can call this unconditionally
// with whatever the client sent.
export const setReturnToCookie = async (path: string | null | undefined) => {
  if (!isSafeReturnPath(path)) return
  const cookies = await nextCookies()
  cookies.set(RETURN_TO_COOKIE, path, {
    maxAge: RETURN_TO_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax", // the magic-link click is a cross-site top-level GET from an email client; "strict" would drop this cookie before verifyMagicLinkAction ever sees it
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

// Reads and deletes the cookie in one call (single use, matches its purpose)
// and re-validates before returning it.
export const consumeReturnToCookie = async (): Promise<string | null> => {
  const cookies = await nextCookies()
  const value = cookies.get(RETURN_TO_COOKIE)?.value
  if (value !== undefined) {
    cookies.set(RETURN_TO_COOKIE, "", { maxAge: -1, path: "/" })
  }
  return isSafeReturnPath(value) ? value : null
}

export const removeCacheId = async () => {
  const cookies = await nextCookies()
  cookies.set("_furni_cache_id", "", {
    maxAge: -1,
  })
}

export const setCacheId = async (cacheId: string) => {
  const cookies = await nextCookies()
  cookies.set("_furni_cache_id", cacheId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}
