"use client"

import { useEffect, useRef } from "react"
import { useCustomer } from "@lib/context/customer-context"

declare global {
  interface Window {
    Tawk_API?: any
    Tawk_LoadStart?: Date
    TawkLoaded?: boolean
  }
}

const TawkToChat = () => {
  const { customer } = useCustomer()
  const customerIdRef = useRef<string | null>(null)
  const loginAttemptedRef = useRef(false)
  const widgetInitializedRef = useRef(false)

  console.log(
    "[TawkToChat] Customer state changed:",
    customer?.customer_account?.id || "no customer"
  )

  // Function to authenticate user and show widget
  const authenticateAndShowWidget = async () => {
    if (typeof window === "undefined") return false

    if (!customer?.customer_account?.id || !customer.customer_account.email) {
      console.warn("[TawkToChat] Missing customer data for authentication")
      return false
    }

    try {
      console.log(
        "[TawkToChat] Generating authentication hash and starting widget..."
      )

      // Get authentication hash from backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_REST_API}/tawk-hash`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customer.customer_account.email,
            type: "login",
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          `Failed to generate authentication hash: ${response.statusText}`
        )
      }

      const { hash } = await response.json()
      console.log("[TawkToChat] Authentication hash generated successfully")

      // Wait for Tawk_API to be available with improved detection
      const waitForTawkAPI = () => {
        return new Promise<void>((resolve, reject) => {
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max

          const checkAPI = () => {
            attempts++
            console.log(
              `[TawkToChat] Checking for Tawk_API, attempt ${attempts}, API available: ${!!window.Tawk_API}`
            )

            // Check if Tawk is fully loaded and API is available
            if (
              window.Tawk_API &&
              typeof window.Tawk_API.login === "function" &&
              typeof window.Tawk_API.showWidget === "function"
            ) {
              console.log("[TawkToChat] Tawk_API is fully ready!")
              resolve()
            } else if (attempts >= maxAttempts) {
              reject(
                new Error("Timeout waiting for Tawk_API to load completely")
              )
            } else {
              setTimeout(checkAPI, 100)
            }
          }

          // If already loaded, check immediately
          if (window.Tawk_API) {
            checkAPI()
          } else {
            // Listen for the TawkLoaded event
            const handleTawkLoaded = () => {
              console.log("[TawkToChat] Received TawkLoaded event")
              window.removeEventListener("TawkLoaded", handleTawkLoaded)
              setTimeout(checkAPI, 100) // Small delay to ensure API is ready
            }

            window.addEventListener("TawkLoaded", handleTawkLoaded)

            // Also start polling as backup
            checkAPI()
          }
        })
      }

      console.log("[TawkToChat] Waiting for Tawk_API to be available...")
      await waitForTawkAPI()

      // Login user to Tawk.to with secure authentication
      window.Tawk_API.login(
        {
          hash: hash,
          userId: customer.customer_account.id,
          name: customer.customer_account.name,
          email: customer.customer_account.email,
          shop: customer.customer_account.shop || "",
          country: customer.b2b_company_address?.country || "",
          "customer-name": customer.name || "",
          role: customer.role || "",
          "account-code": customer.account_code || "",
        },
        function (error: any) {
          if (error) {
            console.warn("[TawkToChat] Authentication error:", error)
          } else {
            console.log(
              "[TawkToChat] User authenticated successfully - showing widget"
            )

            // Show the widget after successful login
            if (
              window.Tawk_API &&
              typeof window.Tawk_API.showWidget === "function"
            ) {
              window.Tawk_API.showWidget()
              widgetInitializedRef.current = true
            }
          }
        }
      )

      return true
    } catch (error) {
      console.error("[TawkToChat] Error during authentication process:", error)
      return false
    }
  }

  // Function to logout and hide widget
  const logoutAndHideWidget = () => {
    if (typeof window === "undefined") return

    console.log("[TawkToChat] Logging out and hiding widget")

    try {
      if (window.Tawk_API) {
        // Use logout with callback as requested
        if (typeof window.Tawk_API.logout === "function") {
          window.Tawk_API.logout(() => {
            console.log("[TawkToChat] Successfully logged out from Tawk.to")
          })
        }

        // Hide the widget
        if (typeof window.Tawk_API.hideWidget === "function") {
          window.Tawk_API.hideWidget()
        }
      }

      // Reset component state
      loginAttemptedRef.current = false
      customerIdRef.current = null
      widgetInitializedRef.current = false
    } catch (error) {
      console.warn("[TawkToChat] Error during logout:", error)
    }
  }

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return
    }

    // Handle user logout or no authentication
    if (!customer || !customer.customer_account?.id) {
      console.log("[TawkToChat] No authenticated customer - hiding chat widget")
      logoutAndHideWidget()
      return
    }

    // User is authenticated
    const currentCustomerId = customer.customer_account.id

    // Check if this is the same customer and widget is already initialized
    if (
      customerIdRef.current === currentCustomerId &&
      widgetInitializedRef.current &&
      window.Tawk_API
    ) {
      console.log("[TawkToChat] Same customer, widget already initialized")
      // Just show the widget if it's hidden
      if (typeof window.Tawk_API.showWidget === "function") {
        window.Tawk_API.showWidget()
      }
      return
    }

    // Different customer or first load - authenticate and show widget
    if (customerIdRef.current !== currentCustomerId) {
      console.log(
        "[TawkToChat] Setting up Tawk.to for customer:",
        currentCustomerId
      )

      // Update customer reference
      customerIdRef.current = currentCustomerId

      // Reset login attempt flag for new customer
      loginAttemptedRef.current = false

      // Logout previous user if any
      if (widgetInitializedRef.current) {
        logoutAndHideWidget()
        // Wait a bit before logging in new user
        setTimeout(() => {
          authenticateAndShowWidget()
        }, 500)
      } else {
        authenticateAndShowWidget()
      }
    }
  }, [customer])

  // This component doesn't render anything visible
  return null
}

export default TawkToChat
