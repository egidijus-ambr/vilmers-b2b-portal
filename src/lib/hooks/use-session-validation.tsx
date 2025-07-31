"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { isTokenExpired } from "@lib/util/jwt-utils"

/**
 * Client-side session validation hook
 * Validates JWT token expiration without making API calls
 */
export function useSessionValidation() {
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const router = useRouter()

  /**
   * Validates the current session
   * Note: JWT token is httpOnly, so we can't access it directly from client-side
   * This hook now serves as a placeholder for future client-side validation needs
   */
  const validateSession = useCallback(() => {
    console.log("[useSessionValidation] Validating session...")
    setIsSessionLoading(true)

    try {
      // Since JWT token is httpOnly, we can't access it from client-side
      // For now, we'll assume session is valid if we reach this point
      // The actual validation happens server-side
      console.log(
        "[useSessionValidation] JWT token is httpOnly, relying on server-side validation"
      )
      setIsSessionValid(true)
      setIsSessionLoading(false)
    } catch (error) {
      console.error("[useSessionValidation] Error during validation:", error)
      setIsSessionValid(false)
      setIsSessionLoading(false)
    }
  }, [router])

  /**
   * Handle storage events (for cross-tab synchronization)
   */
  const handleStorageChange = useCallback(
    (event: StorageEvent) => {
      if (event.key === "_furni_jwt" || event.key === null) {
        console.log(
          "[useSessionValidation] Storage change detected, revalidating..."
        )
        validateSession()
      }
    },
    [validateSession]
  )

  /**
   * Handle cookie changes (for cross-tab synchronization)
   */
  const handleCookieChange = useCallback(() => {
    console.log(
      "[useSessionValidation] Cookie change detected, revalidating..."
    )
    validateSession()
  }, [validateSession])

  // Initial validation and setup
  useEffect(() => {
    validateSession()

    // Set up periodic validation (every 5 minutes)
    const interval = setInterval(validateSession, 5 * 60 * 1000)

    // Listen for storage events (cross-tab synchronization)
    window.addEventListener("storage", handleStorageChange)

    // Listen for focus events to revalidate when tab becomes active
    window.addEventListener("focus", validateSession)

    // Listen for cookie changes (using a simple polling approach)
    const cookieInterval = setInterval(() => {
      const cookies = document.cookie
      if (cookies !== (window as any).__lastCookies) {
        ;(window as any).__lastCookies = cookies
        handleCookieChange()
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(cookieInterval)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", validateSession)
    }
  }, [validateSession, handleStorageChange, handleCookieChange])

  return {
    isSessionValid,
    isSessionLoading,
    validateSession,
  }
}

/**
 * Higher-order component for protecting authenticated routes
 */
export function withSessionValidation<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function SessionValidatedComponent(props: P) {
    const { isSessionValid, isSessionLoading } = useSessionValidation()
    const router = useRouter()

    useEffect(() => {
      if (!isSessionLoading && !isSessionValid) {
        console.log(
          "[withSessionValidation] Invalid session, redirecting to login..."
        )
        router.push("/lt/account")
      }
    }, [isSessionValid, isSessionLoading, router])

    // Show loading while validating
    if (isSessionLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )
    }

    // Don't render component if session is invalid
    if (!isSessionValid) {
      return null
    }

    return <WrappedComponent {...props} />
  }
}
