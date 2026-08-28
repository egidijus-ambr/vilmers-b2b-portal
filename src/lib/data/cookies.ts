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
