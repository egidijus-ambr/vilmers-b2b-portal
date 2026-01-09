"use client"

import { useState, useEffect } from "react"

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
    const standaloneMode = window.matchMedia("(display-mode: standalone)").matches

    // Check iOS Safari standalone mode
    // iOS uses navigator.standalone property
    const iosStandalone = (window.navigator as any).standalone === true

    setIsStandalone(standaloneMode || iosStandalone)
  }, [])

  return isStandalone
}
