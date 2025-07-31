"use client"

import React, { createContext, useContext, useMemo } from "react"
import { useTranslation, I18nextProvider } from "react-i18next"
import { usePathname } from "next/navigation"
import i18n from "./client-config"
import {
  SupportedLanguage,
  supportedLanguages,
  defaultLanguage,
  getLanguageFromPath,
  getBackendLanguageCode,
} from "./config"

interface I18nContextType {
  language: SupportedLanguage
  changeLanguage: (lang: SupportedLanguage) => void
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const pathname = usePathname()

  // Get current language from URL - middleware ensures it's always valid
  const language = getLanguageFromPath(pathname) || defaultLanguage

  // Sync i18next with URL language changes
  React.useEffect(() => {
    const backendLanguage = getBackendLanguageCode(language)

    // Only change if i18next is not already on the correct language
    if (i18n.language !== backendLanguage) {
      i18n.changeLanguage(backendLanguage).catch((error) => {
        console.error("Failed to sync language with URL:", error)
      })
    }
  }, [language])

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    const changeLanguage = async (lang: SupportedLanguage) => {
      if (supportedLanguages.includes(lang)) {
        try {
          // Convert UI language to backend language for i18next
          const backendLanguage = getBackendLanguageCode(lang)
          await i18n.changeLanguage(backendLanguage)

          // Store language preference in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("preferred-language", lang)
          }
        } catch (error) {
          console.error("Failed to change language:", error)
        }
      }
    }

    return {
      language,
      changeLanguage,
    }
  }, [language])

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={contextValue}>
        {children}
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

// Simplified hook for translations
export function useTranslations(namespace?: string) {
  const { t, i18n } = useTranslation(namespace)
  const { language, changeLanguage } = useI18n()

  return {
    t,
    language,
    changeLanguage,
    isReady: i18n.isInitialized,
  }
}
