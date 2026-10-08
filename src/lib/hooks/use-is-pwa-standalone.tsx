"use client"

import { useState, useEffect } from "react"

const DISPLAY_MODES = [
  "standalone",
  "window-controls-overlay",
  "fullscreen",
  "minimal-ui",
] as const

/**
 * Hook to detect if the app is running in PWA standalone mode
 *
 * This hook centralizes PWA detection logic to avoid duplication across components.
 * It checks multiple indicators to determine if the app is running as an installed PWA
 * rather than in a regular browser tab.
 *
 * Detection methods:
 * - display-mode: standalone (most browsers)
 * - navigator.standalone (iOS Safari)
 *
 * @returns boolean - true if running as PWA desktop/mobile app, false otherwise
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isPWA = useIsPWAStandalone()
 *
 *   return (
 *     <div>
 *       {isPWA ? "Running as PWA" : "Running in browser"}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIsPWAStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (PWA desktop/mobile app)
    // This covers Chrome, Edge, Firefox PWAs
    // Installed apps may use any of these display modes
    const queries = DISPLAY_MODES.map((m) =>
      window.matchMedia(`(display-mode: ${m})`)
    )

    const check = () => {
      // iOS Safari uses the navigator.standalone property
      const iosStandalone = (window.navigator as any).standalone === true
      setIsStandalone(iosStandalone || queries.some((q) => q.matches))
    }

    check()
    queries.forEach((q) => q.addEventListener?.("change", check))
    return () => {
      queries.forEach((q) => q.removeEventListener?.("change", check))
    }
  }, [])

  return isStandalone
}
