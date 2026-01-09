"use client"

import { useState, useEffect } from "react"
import { X, Download, Smartphone } from "lucide-react"
import { useIsPWAStandalone } from "@lib/hooks/use-is-pwa-standalone"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const isStandalone = useIsPWAStandalone()

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Don't show if already dismissed recently
      const dismissed = localStorage.getItem("pwa-install-dismissed")
      const dismissedTime = dismissed ? parseInt(dismissed) : 0
      const now = Date.now()
      const oneDayMs = 24 * 60 * 60 * 1000

      if (now - dismissedTime > oneDayMs) {
        setShowInstallPrompt(true)
      }
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log("PWA was installed")
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem("pwa-install-dismissed")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    // Show iOS install prompt if conditions are met
    if (
      iOS &&
      !isStandalone &&
      !localStorage.getItem("pwa-install-dismissed-ios")
    ) {
      setTimeout(() => setShowInstallPrompt(true), 2000)
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [isStandalone])

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, just show instructions
      return
    }

    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt")
      } else {
        console.log("User dismissed the install prompt")
        localStorage.setItem("pwa-install-dismissed", Date.now().toString())
      }
    } catch (error) {
      console.error("Error showing install prompt:", error)
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    const dismissKey = isIOS
      ? "pwa-install-dismissed-ios"
      : "pwa-install-dismissed"
    localStorage.setItem(dismissKey, Date.now().toString())
  }

  // Don't show if already installed
  if (isStandalone || !showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-slide-up">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Install App</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Install this app for a better experience:
            </p>
            <ol className="text-xs text-gray-500 space-y-1">
              <li>1. Tap the Share button in Safari</li>
              <li>2. Select "Add to Home Screen"</li>
              <li>3. Tap "Add" to install</li>
            </ol>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-3">
              Install our app for faster access and offline functionality.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-md transition-colors"
              >
                Not Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
