import i18n from "i18next"
import Backend from "i18next-locize-backend"
import { i18nConfig, getI18nextLanguageCode, defaultLanguage } from "./config"

// Server-side i18n configuration for SSR
const createServerI18n = () => {
  const serverI18n = i18n.createInstance()

  serverI18n.use(Backend).init({
    ...i18nConfig,
    debug: false, // Disable debug in server-side
    fallbackLng: getI18nextLanguageCode(defaultLanguage),

    // Disable language detection on server
    detection: {
      order: [],
      caches: [],
    },

    // Important: Wait for resources to load
    initImmediate: false,

    // Cache translations for better performance
    cache: {
      enabled: true,
    },
  })

  return serverI18n
}

// Cache for server-side translations
const translationCache = new Map<string, any>()

// Server-side translation function
export const getServerTranslations = async (
  language: string,
  namespaces: string[] = ["common"]
): Promise<Record<string, any>> => {
  const cacheKey = `${language}-${namespaces.join(",")}`

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    const serverI18n = createServerI18n()

    // Load the language and namespaces
    await serverI18n.loadLanguages(language)
    await serverI18n.loadNamespaces(namespaces)

    // Change to the target language
    await serverI18n.changeLanguage(language)

    // Extract all translations for the namespaces
    const translations: Record<string, any> = {}

    for (const ns of namespaces) {
      const nsTranslations = serverI18n.getResourceBundle(language, ns)
      if (nsTranslations) {
        // Flatten the translations with namespace prefix
        Object.keys(nsTranslations).forEach((key) => {
          translations[`${ns}:${key}`] = nsTranslations[key]
          // Also add without namespace for default namespace
          if (ns === "common") {
            translations[key] = nsTranslations[key]
          }
        })
      }
    }

    // Cache the result
    translationCache.set(cacheKey, translations)

    return translations
  } catch (error) {
    console.error("Failed to load server translations:", error)
    return {}
  }
}

// Helper function to get a specific translation
export const getServerTranslation = async (
  language: string,
  key: string,
  namespace: string = "common"
): Promise<string> => {
  try {
    const translations = await getServerTranslations(language, [namespace])
    return translations[key] || translations[`${namespace}:${key}`] || key
  } catch (error) {
    console.error("Failed to get server translation:", error)
    return key
  }
}

export default createServerI18n
