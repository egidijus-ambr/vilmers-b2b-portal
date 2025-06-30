"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useTranslation, I18nextProvider } from "react-i18next"
import i18n from "./client-config"
import { SupportedLanguage, supportedLanguages, defaultLanguage } from "./index"

interface I18nContextType {
  language: SupportedLanguage
  changeLanguage: (lang: SupportedLanguage) => void
  isLoading: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: React.ReactNode
  initialLanguage?: SupportedLanguage
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(
    initialLanguage || defaultLanguage
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        // Set the initial language
        await i18n.changeLanguage(language)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize i18n:", error)
        setIsLoading(false)
      }
    }

    initializeI18n()
  }, [language])

  const changeLanguage = async (lang: SupportedLanguage) => {
    if (supportedLanguages.includes(lang)) {
      setIsLoading(true)
      try {
        await i18n.changeLanguage(lang)
        setLanguage(lang)

        // Store language preference in localStorage
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
