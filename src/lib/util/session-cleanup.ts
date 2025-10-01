"use client"

/**
 * Comprehensive session and storage cleanup utility
 * Clears all application data from the browser
 */
export const clearAllSessionData = async (): Promise<void> => {
  try {
    console.log("[Session Cleanup] Starting comprehensive data cleanup...")

    // First clear server-side httpOnly cookies via API
    console.log("[Session Cleanup] Clearing server-side cookies...")
    try {
      const response = await fetch("/api/clear-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log("[Session Cleanup] Server-side cleanup result:", result)
      } else {
        console.warn(
          "[Session Cleanup] Server-side cleanup failed:",
          response.statusText
        )
      }
    } catch (error) {
      console.warn("[Session Cleanup] Server-side cleanup error:", error)
    }

    // Clear all localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      console.log("[Session Cleanup] Clearing localStorage...")
      window.localStorage.clear()
    }

    // Clear all sessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      console.log("[Session Cleanup] Clearing sessionStorage...")
      window.sessionStorage.clear()
    }

    // Clear all cookies by setting them to expire
    if (typeof document !== "undefined") {
      console.log("[Session Cleanup] Clearing client-side cookies...")

      // Get all cookies
      const cookies = document.cookie.split(";")

      // Clear each cookie
      cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name) {
          // Clear cookie for current domain
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
        }
      })

      // Specifically clear known application cookies (client-side accessible ones)
      const appCookies = ["i18next", "i18nextLng"]
      appCookies.forEach((cookieName) => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
      })
    }

    // Clear IndexedDB if available
    if (typeof window !== "undefined" && window.indexedDB) {
      console.log("[Session Cleanup] Clearing IndexedDB...")
      try {
        const databases = await window.indexedDB.databases()
        await Promise.all(
          databases.map((db) => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = window.indexedDB.deleteDatabase(db.name!)
                deleteReq.onsuccess = () => resolve()
                deleteReq.onerror = () => reject(deleteReq.error)
              })
            }
          })
        )
      } catch (error) {
        console.warn("[Session Cleanup] IndexedDB cleanup failed:", error)
      }
    }

    // Clear WebSQL if available (deprecated but still used by some browsers)
    if (typeof window !== "undefined" && (window as any).openDatabase) {
      console.log("[Session Cleanup] Clearing WebSQL...")
      try {
        const db = (window as any).openDatabase("", "", "", "")
        if (db) {
          db.transaction((tx: any) => {
            tx.executeSql("DROP TABLE IF EXISTS furni_data")
          })
        }
      } catch (error) {
        console.warn("[Session Cleanup] WebSQL cleanup failed:", error)
      }
    }

    // Clear any service worker caches
    if (typeof window !== "undefined" && "caches" in window) {
      console.log("[Session Cleanup] Clearing service worker caches...")
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      } catch (error) {
        console.warn("[Session Cleanup] Cache cleanup failed:", error)
      }
    }

    console.log(
      "[Session Cleanup] Comprehensive cleanup completed successfully"
    )
  } catch (error) {
    console.error("[Session Cleanup] Error during cleanup:", error)
    throw error
  }
}

/**
 * Clear session data and redirect to home page
 */
export const clearSessionAndRedirect = async (
  redirectUrl: string = "/"
): Promise<void> => {
  await clearAllSessionData()

  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    window.location.href = redirectUrl
  }, 100)
}

/**
 * Clear session data and reload the page
 */
export const clearSessionAndReload = async (): Promise<void> => {
  await clearAllSessionData()

  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    window.location.reload()
  }, 100)
}
