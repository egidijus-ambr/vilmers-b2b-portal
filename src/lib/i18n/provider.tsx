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
  getBackendLanguageCode,
  getUILanguageCodeFromBackend,
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

  // Initialize language from URL - middleware ensures URL always has valid language
  const currentLanguage = getLanguageFromPath(pathname) || defaultLanguage
  const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage)
  const [isLoading, setIsLoading] = useState(false)

  // Simple initialization - set language from URL on mount
  useEffect(() => {
    const backendLanguage = getBackendLanguageCode(currentLanguage)

    // Ensure i18n is initialized before changing language
    if (i18n.isInitialized) {
      i18n
        .changeLanguage(backendLanguage)
        .then(() => {
          setLanguage(currentLanguage)
        })
        .catch((error) => {
          console.error("Failed to change language on init:", error)
          setLanguage(currentLanguage)
        })
    } else {
      // Wait for i18n to initialize
      i18n.on("initialized", () => {
        i18n
          .changeLanguage(backendLanguage)
          .then(() => {
            setLanguage(currentLanguage)
          })
          .catch((error) => {
            console.error("Failed to change language after init:", error)
            setLanguage(currentLanguage)
          })
      })
    }
  }, [currentLanguage])

  // Sync language when pathname changes (for navigation)
  useEffect(() => {
    const newLanguage = getLanguageFromPath(pathname)
    if (newLanguage && newLanguage !== language) {
      const backendLanguage = getBackendLanguageCode(newLanguage)
      i18n
        .changeLanguage(backendLanguage)
        .then(() => {
          setLanguage(newLanguage)
        })
        .catch((error) => {
          console.error("Failed to change language on navigation:", error)
          setLanguage(newLanguage)
        })
    }
  }, [pathname, language])

  const changeLanguage = async (lang: SupportedLanguage) => {
    if (supportedLanguages.includes(lang)) {
      setIsLoading(true)
      try {
        // Convert UI language to backend language for i18next
        const backendLanguage = getBackendLanguageCode(lang)
        await i18n.changeLanguage(backendLanguage)
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
