"use client"

import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { createI18nInstance } from "./unified-config"

// Create client-side i18next instance using unified configuration
const { instance, config } = createI18nInstance({
  isServer: false,
  enableDebug: true, // Enable debug in development
  enableDetection: false, // Middleware handles detection
})

// Initialize client-side i18next
instance.use(LanguageDetector).use(initReactI18next).init(config)

export default instance
