import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import resourcesToBackend from "i18next-resources-to-backend"
import Backend from "i18next-locize-backend"

// Define supported languages
export const supportedLanguages = ["en", "fr", "de", "lt"] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

// Default language
export const defaultLanguage: SupportedLanguage = "lt"

// Initialize i18next
i18n
  .use(Backend)
  .use(initReactI18next)
  // .use(
  //   resourcesToBackend((language: string, namespace: string) => {
  //     return import(`./locales/${language}/${namespace}.json`)
  //   })
  // )
  .init({
    debug: process.env.NODE_ENV === "development",
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    defaultNS: "common",
    ns: ["common", "navigation", "product", "cart", "checkout", "account"],

    // Disable automatic language detection - we handle it manually via URL
    lng: defaultLanguage,

    // Disable all automatic detection to prevent hydration mismatches
    detection: {
      order: [],
      caches: [],
    },

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
