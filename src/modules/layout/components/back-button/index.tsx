"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Back from "@modules/common/icons/back"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "@lib/i18n"
import { supportedLanguages } from "@lib/i18n"

interface BackButtonProps {
  isHomePage?: boolean
  className?: string
}

const BackButton = ({
  isHomePage = false,
  className = "",
}: BackButtonProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const { t, isReady } = useTranslations("common")
  const [canGoBack, setCanGoBack] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Check if we can go back in browser history
    // We check if history length > 1 to see if there's previous navigation
    if (typeof window !== "undefined") {
      setCanGoBack(window.history.length > 1)
    }
  }, [pathname])

  // Don't show back button on home page
  const pathSegments = pathname.split("/").filter(Boolean)
  const isOnHomePage =
    pathname === "/" ||
    (pathSegments.length === 1 &&
      supportedLanguages.includes(pathSegments[0] as any))

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back()
    } else {
      // Fallback: navigate to home if no history
      router.push("/")
    }
  }

  // Don't render if:
  // - Not client-side yet
  // - On home page
  // - Can't go back
  if (!isClient || isOnHomePage || !canGoBack) {
    return null
  }

  return (
    <button
      onClick={handleBack}
      className={`
        flex items-center justify-center
        w-9 h-9 small:w-8 small:h-8 

        ${
          isHomePage
            ? "text-white focus:ring-white"
            : "text-ui-fg-subtle  focus:ring-ui-fg-subtle hover:text-ui-fg-base"
        }
        ${className}
      `}
      aria-label={isReady ? t("back") : "Back"}
      title={isReady ? t("back") : "Back"}
      data-testid="nav-back-button"
    >
      <ArrowLeft size="18" className="small:w-4 small:h-4" />
    </button>
  )
}

export default BackButton
