"use client"

import { useEffect, useRef } from "react"
import { useCustomer } from "@lib/context/customer-context"

declare global {
  interface Window {
    Tawk_API?: any
    Tawk_LoadStart?: Date
  }
}

const TawkToChat = () => {
  const { customer } = useCustomer()
  const scriptLoadedRef = useRef(false)
  const customerIdRef = useRef<string | null>(null)
  const loginAttemptedRef = useRef(false)

  console.log(
    "[TawkToChat] Customer state changed:",
    customer?.customer_account?.id || "no customer"
  )

  // Function to authenticate user to Tawk.to with secure hash and conversation history
  const authenticateTawkUser = async () => {
    // Only run on client side
    if (typeof window === "undefined") return null

    if (!customer?.customer_account?.id || !customer.customer_account.email) {
      console.warn("[TawkToChat] Missing customer data for authentication")
      return null
    }

    // if (loginAttemptedRef.current) {
    //   console.log(
    //     "[TawkToChat] Authentication already attempted for this session"
    //   )
    //   return null
    // }

    loginAttemptedRef.current = true

    try {
      console.log(
        "[TawkToChat] Generating authentication hash for user verification and conversation retrieval..."
      )

      // Get authentication hash from our API route
      const response = await fetch("/api/tawk-hash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: customer.customer_account.id,
          email: customer.customer_account.email,
          type: "login", // Using login type for full authentication
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Failed to generate authentication hash: ${response.statusText}`
        )
      }

      const { hash } = await response.json()
      console.log("[TawkToChat] Authentication hash generated successfully")

      // Login user to Tawk.to with secure authentication and conversation history
      if (typeof window.Tawk_API?.login === "function") {
        window.Tawk_API.login(
          {
            hash: hash,
            userId: customer.customer_account.id,
            name: customer.customer_account.name,
            email: customer.customer_account.email,
            shop: customer.customer_account.shop || "",
            country: customer.b2b_company_address?.country || "",
            role: customer.role || "",
            "account-code": customer.account_code || "",
          },
          function (error: any) {
            if (error) {
              console.warn("[TawkToChat] Authentication error:", error)
            } else {
              console.log(
                "[TawkToChat] User authenticated successfully - conversation history and secure mode active"
              )
            }
          }
        )
      } else {
        console.warn("[TawkToChat] Tawk.to login function not available")
      }

      return hash
    } catch (error) {
      console.error("[TawkToChat] Error during authentication process:", error)
      return null
    }
  }

  // Function to load Tawk.to script dynamically
  const loadTawkToScript = () => {
    if (typeof window === "undefined") return

    console.log("[TawkToChat] Loading Tawk.to script dynamically")

    // Initialize Tawk globals
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    // Set up authentication handler
    // window.Tawk_API.onLoad = function () {
    //   console.log("[TawkToChat] Tawk.to loaded, attempting user authentication")
    //   authenticateTawkUser()
    // }

    // Create and inject script
    const script = document.createElement("script")
    script.async = true
    script.src = "https://embed.tawk.to/692400fe12586c1960a8d887/1jaqa7p8d"
    script.charset = "UTF-8"
    script.setAttribute("crossorigin", "*")

    script.onload = () => {
      console.log("[TawkToChat] Tawk.to script loaded successfully")
      authenticateTawkUser()
      scriptLoadedRef.current = true
    }

    script.onerror = (error) => {
      console.error("[TawkToChat] Error loading Tawk.to script:", error)
      scriptLoadedRef.current = false
    }

    // Insert script into DOM
    const firstScript = document.getElementsByTagName("script")[0]
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript)
    } else {
      document.head.appendChild(script)
    }
  }

  // Function to clean up Tawk.to completely
  const cleanupTawkTo = () => {
    if (typeof window === "undefined") return

    console.log("[TawkToChat] Cleaning up Tawk.to")

    try {
      // Logout and hide widget
      if (window.Tawk_API) {
        if (typeof window.Tawk_API.logout === "function") {
          window.Tawk_API.logout()
        }
        if (typeof window.Tawk_API.hideWidget === "function") {
          window.Tawk_API.hideWidget()
        }
        if (typeof window.Tawk_API.endChat === "function") {
          window.Tawk_API.endChat()
        }
      }

      // Remove script from DOM
      const existingScript = document.querySelector('script[src*="tawk.to"]')
      if (existingScript?.parentNode) {
        existingScript.parentNode.removeChild(existingScript)
      }

      // Remove Tawk.to DOM elements
      const tawkElements = document.querySelectorAll(
        '[id*="tawk"], [class*="tawk"]'
      )
      tawkElements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })

      // Clear globals
      delete window.Tawk_API
      delete window.Tawk_LoadStart

      // Reset component state
      scriptLoadedRef.current = false
      loginAttemptedRef.current = false
      customerIdRef.current = null
    } catch (error) {
      console.warn("[TawkToChat] Error during cleanup:", error)
    }
  }

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return
    }

    // Handle user logout or no authentication
    if (!customer || !customer.customer_account?.id) {
      console.log(
        "[TawkToChat] No authenticated customer - removing chat widget"
      )
      cleanupTawkTo()
      return
    }

    // User is authenticated
    const currentCustomerId = customer.customer_account.id

    // Check if this is the same customer
    // if (
    //   customerIdRef.current === currentCustomerId &&
    //   scriptLoadedRef.current
    // ) {
    //   console.log("[TawkToChat] Same customer, showing existing widget")
    //   if (window.Tawk_API && typeof window.Tawk_API.showWidget === "function") {
    //     window.Tawk_API.showWidget()
    //   }
    //   return
    // }

    // Different customer or first load
    // console.log(
    //   "[TawkToChat] Setting up Tawk.to for customer:",
    //   currentCustomerId
    // )

    // // Clean up previous instance if exists
    // if (scriptLoadedRef.current) {
    //   console.log("[TawkToChat] Cleaning up previous Tawk.to instance")
    //   cleanupTawkTo()
    //   // Wait for cleanup before loading new instance
    //   setTimeout(() => {
    //     customerIdRef.current = currentCustomerId
    //     loadTawkToScript()
    //   }, 1000)
    // } else {
    //   // First load
    //   customerIdRef.current = currentCustomerId
    //   loadTawkToScript()
    // }

    loadTawkToScript()

    // Cleanup on unmount
    return () => {
      // Don't cleanup on unmount to maintain chat across navigation
      // Only cleanup when user logs out (handled above)
    }
  }, [customer])

  // This component doesn't render anything visible
  return null
}

export default TawkToChat
