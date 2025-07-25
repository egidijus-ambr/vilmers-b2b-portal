"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import Backend from "i18next-locize-backend"
import { i18nConfig } from "./config"

// Language detection options - optimized to work with URL-based routing
const detectionOptions = {
  // Prioritize URL path and stored preferences, minimize auto-detection
  order: ["path", "cookie", "localStorage"],
  caches: ["localStorage", "cookie"],
  excludeCacheFor: ["cimode"],
  cookieMinutes: 60 * 24 * 30, // 30 days
  cookieDomain:
    typeof window !== "undefined" ? window.location.hostname : undefined,
  // Enable whitelist checking to prevent unsupported language codes
  checkWhitelist: true,
  lookupFromPathIndex: 0,
  lookupFromSubdomainIndex: 0,
  // Custom converter to handle dk -> da-DK mapping
  convertDetectedLanguage: (lng: string) => {
    if (lng === "dk") return "da-DK"
    if (lng === "da") return "da-DK"
    return lng
  },
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
      useSuspense: false, // Disable suspense to prevent hydration issues
    },
    // Prevent automatic initialization to avoid language flash
    initImmediate: false,
    // Load resources synchronously when possible
    partialBundledLanguages: true,
  })

export default i18n
