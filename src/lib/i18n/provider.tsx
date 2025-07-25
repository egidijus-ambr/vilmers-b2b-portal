"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  Suspense,
} from "react"
import { useTranslation, I18nextProvider } from "react-i18next"
import { usePathname } from "next/navigation"
import i18n from "./client-config"
import {
  SupportedLanguage,
  supportedLanguages,
  defaultLanguage,
  getLanguageFromPath,
  getI18nextLanguageCode,
  getUILanguageCode,
} from "./config"

interface I18nContextType {
  language: SupportedLanguage
  changeLanguage: (lang: SupportedLanguage) => void
  isLoading: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Loading fallback component for Suspense
function TranslationLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const pathname = usePathname()

  // Initialize language from URL immediately to prevent hydration mismatch
  const initialLanguage = getLanguageFromPath(pathname) || defaultLanguage
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage)
  const [isLoading, setIsLoading] = useState(false) // Start with false to prevent flash
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize i18n synchronously to prevent hydration mismatch
  React.useLayoutEffect(() => {
    if (!isInitialized) {
      // Change language synchronously using the mapped i18next language code
      const i18nextLanguageCode = getI18nextLanguageCode(initialLanguage)

      // Set the language immediately without waiting for async operations
      if (i18n.isInitialized) {
        i18n.changeLanguage(i18nextLanguageCode)
      } else {
        // If i18n is not initialized yet, set it directly
        i18n.language = i18nextLanguageCode
      }

      setLanguage(initialLanguage)
      setIsInitialized(true)
      setIsLoading(false)
    }
  }, [initialLanguage, isInitialized])

  // Sync language when pathname changes (for navigation)
  React.useEffect(() => {
    const newLanguage = getLanguageFromPath(pathname)
    if (newLanguage && newLanguage !== language && isInitialized) {
      const i18nextLanguageCode = getI18nextLanguageCode(newLanguage)
      i18n.changeLanguage(i18nextLanguageCode)
      setLanguage(newLanguage)
    }
  }, [pathname, language, isInitialized])

  // Listen for language changes from i18n
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      // Convert i18next language code back to UI language code
      const uiLanguageCode = getUILanguageCode(lng)
      if (
        supportedLanguages.includes(uiLanguageCode) &&
        uiLanguageCode !== language
      ) {
        setLanguage(uiLanguageCode)
      }
    }

    i18n.on("languageChanged", handleLanguageChange)

    return () => {
      i18n.off("languageChanged", handleLanguageChange)
    }
  }, [language])

  const changeLanguage = async (lang: SupportedLanguage) => {
    if (supportedLanguages.includes(lang)) {
      setIsLoading(true)
      try {
        // Convert UI language code to i18next language code
        const i18nextLanguageCode = getI18nextLanguageCode(lang)
        await i18n.changeLanguage(i18nextLanguageCode)
        setLanguage(lang)

        // Store language preference in localStorage (using UI language code)
        if (typeof window !== "undefined") {
          localStorage.setItem("preferred-language", lang)
        }
      } catch (error) {
        console.error("Failed to change language:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const contextValue: I18nContextType = {
    language,
    changeLanguage,
    isLoading,
  }

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={contextValue}>
        <Suspense fallback={<TranslationLoadingFallback />}>
          {children}
        </Suspense>
      </I18nContext.Provider>
    </I18nextProvider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

// Custom hook for translations with better TypeScript support
export function useTranslations(namespace?: string) {
  const { t, i18n } = useTranslation(namespace)
  const { language, changeLanguage, isLoading } = useI18n()

  return {
    t,
    language,
    changeLanguage,
    isLoading,
    isReady: i18n.isInitialized && !isLoading,
  }
}

// Language detection hook for client-side
export function useLanguageDetection() {
  const { changeLanguage } = useI18n()

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for stored language preference
      const storedLanguage = localStorage.getItem(
        "preferred-language"
      ) as SupportedLanguage
      if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
        changeLanguage(storedLanguage)
        return
      }

      // Detect browser language
      const browserLanguage = navigator.language.split(
        "-"
      )[0] as SupportedLanguage
      if (supportedLanguages.includes(browserLanguage)) {
        changeLanguage(browserLanguage)
      }
    }
  }, [changeLanguage])
}
