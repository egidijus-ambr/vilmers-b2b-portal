"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-locize-backend"
import { i18nConfig } from "./config"

// Simplified detection options - middleware handles language detection
const detectionOptions = {
  // Disable automatic detection since middleware handles it
  order: [],
  caches: [],
}

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...i18nConfig,
    detection: detectionOptions,
    react: {
      useSuspense: true,
    },
    // Set initial language to prevent flash
    lng: i18nConfig.fallbackLng,
    // Allow immediate initialization but with fallback language
    initImmediate: true,
    // Load resources synchronously when possible
    partialBundledLanguages: true,
  })

export default i18n
