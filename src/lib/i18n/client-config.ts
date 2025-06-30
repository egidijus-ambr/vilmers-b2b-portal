"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import resourcesToBackend from "i18next-resources-to-backend"
import { supportedLanguages, defaultLanguage } from "./index"
import Backend from "i18next-locize-backend"
// Language detection options
const detectionOptions = {
  order: ["path", "cookie", "localStorage", "navigator", "htmlTag"],
  caches: ["localStorage", "cookie"],
  excludeCacheFor: ["cimode"],
  cookieMinutes: 60 * 24 * 30, // 30 days
  cookieDomain:
    typeof window !== "undefined" ? window.location.hostname : undefined,
}

// Initialize i18next
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  //   .use(
  //     resourcesToBackend((language: string, namespace: string) => {
  //       return import(`./locales/${language}/${namespace}.json`)
  //     })
  //   )
  .init({
    debug: process.env.NODE_ENV === "development",
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    defaultNS: "common",
    ns: ["common", "navigation", "product", "cart", "checkout", "account"],

    detection: detectionOptions,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },

    // Backend options for loading translations
    // backend: {
    //   loadPath: "/locales/{{lng}}/{{ns}}.json",
    // },
    backend: {
      projectId: "5f861ad5-034b-4e24-8dd8-ff0f2b329332",
      apiKey: "abd728f2-06fe-48ae-8bd8-57cee71e1f50",
      referenceLng: "en",
    },
    saveMissing: true, // Enable saving missing translations
  })

export default i18n
