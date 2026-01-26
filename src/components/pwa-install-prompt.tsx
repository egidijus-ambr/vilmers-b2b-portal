"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
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
  // Check if PWA install prompt is enabled via environment variable
  const isPWAPromptEnabled = process.env.NEXT_PUBLIC_SHOW_PWA_PROMPT === 'true'

  // Return early if prompt is disabled
  if (!isPWAPromptEnabled) {
    return null
  }

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const isStandalone = useIsPWAStandalone()

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if it's macOS Safari
    const isMacOsSafari = (): boolean => {
      const userAgent = navigator.userAgent.toLowerCase()

      // Check if it's macOS (using userAgent since platform is deprecated)
      const isMac =
        userAgent.includes("mac os x") || userAgent.includes("macintosh")

      // Check if it's Safari (and not Chrome or other browsers)
      const isSafari =
        userAgent.includes("safari") &&
        !userAgent.includes("chrome") &&
        !userAgent.includes("chromium") &&
        !userAgent.includes("edg")

      return isMac && isSafari
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Suppress install prompt on macOS Safari
      if (isMacOsSafari()) {
        console.log("PWA install prompt suppressed on macOS Safari")
        e.preventDefault()
        return
      }

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
    <div className="fixed inset-0 flex items-end justify-center bg-black/50 z-50 p-4 pb-8">
      <div className="w-full max-w-96 bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header section with laptop image */}
        <div className="relative h-28 bg-stone-100 rounded-tl-2xl rounded-tr-2xl">
          {/* Laptop image */}
          <div className="w-full h-full flex items-center justify-center">
            <Image
              src="/images/pwa-laptop-header.png"
              alt=""
              width={250}
              height={106}
              className="object-contain"
              priority
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-white/50 rounded-full transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-5 h-5 text-stone-400" strokeWidth={2} />
          </button>
        </div>

        {/* Content section */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-black font-['Montserrat']">
            Install App
          </h2>
          <p className="text-md font-normal text-black font-['Montserrat'] leading-snug">
            {isIOS
              ? "Tap Share → Add to Home Screen → Add"
              : "Install our app for faster access and offline functionality."}
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={handleInstall}
            className="flex-1 h-8 px-6 bg-[#9A8555] hover:bg-[#8a7545] rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="text-white text-sm font-normal font-['Montserrat']">
              Install Now
            </span>
          </button>

          <button
            onClick={handleDismiss}
            className="px-6 h-8 rounded-full border border-[#9A8555] hover:bg-stone-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="text-[#9A8555] text-sm font-normal font-['Montserrat']">
              Later
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
