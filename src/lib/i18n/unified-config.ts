import i18n from "i18next"
import resourcesToBackend from "i18next-resources-to-backend"
import {
  i18nConfig,
  getBackendLanguageCode,
  defaultLanguage,
  supportedLanguages,
} from "./config"

// Unified i18next configuration factory
export interface I18nInstanceOptions {
  isServer?: boolean
  enableDebug?: boolean
  enableDetection?: boolean
  initialLanguage?: string
}

// Local resource loader function
const loadLocalResource = async (language: string, namespace: string) => {
  try {
    // Dynamic import of translation files
    const resource = await import(`./locales/${language}/${namespace}.json`)
    return resource.default || resource
  } catch (error) {
    console.warn(
      `Failed to load translation file: ${language}/${namespace}`,
      error
    )
    return null
  }
}

export const createI18nInstance = (options: I18nInstanceOptions = {}) => {
  const {
    isServer = false,
    enableDebug = false,
    enableDetection = false,
    initialLanguage,
  } = options

  // Create new instance for server, use singleton for client
  const instance = isServer ? i18n.createInstance() : i18n

  // Base configuration
  const config = {
    ...i18nConfig,
    debug: enableDebug && process.env.NODE_ENV === "development",
    lng: initialLanguage || getBackendLanguageCode(defaultLanguage),
    fallbackLng: getBackendLanguageCode(defaultLanguage),

    // Detection configuration
    detection: enableDetection
      ? {
          order: ["path", "cookie", "localStorage"],
          caches: ["localStorage", "cookie"],
          excludeCacheFor: ["cimode"],
        }
      : {
          order: [],
          caches: [],
        },

    // Server-specific options
    ...(isServer && {
      initImmediate: false,
      // Use i18next built-in caching instead of custom cache
      cache: {
        enabled: true,
        prefix: "i18next_res_",
        expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),

    // Client-specific options
    ...(!isServer && {
      react: {
        useSuspense: true,
      },
      initImmediate: true,
      partialBundledLanguages: true,
    }),
  }

  // Initialize with local resources backend
  instance.use(resourcesToBackend(loadLocalResource))

  return { instance, config }
}

// Unified translation loading utility
export const loadTranslations = async (
  instance: typeof i18n,
  language: string,
  namespaces: string[] = ["common"]
): Promise<Record<string, any>> => {
  try {
    // Ensure the instance is initialized
    if (!instance.isInitialized) {
      await new Promise<void>((resolve, reject) => {
        instance.on("initialized", () => resolve())
        instance.on("failedLoading", reject)
      })
    }

    // Load the language and namespaces
    await instance.loadLanguages(language)
    await instance.loadNamespaces(namespaces)

    // Change to the target language
    await instance.changeLanguage(language)

    // Extract all translations for the namespaces
    const translations: Record<string, any> = {}

    for (const ns of namespaces) {
      const nsTranslations = instance.getResourceBundle(language, ns)
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

    return translations
  } catch (error) {
    console.error("Failed to load translations:", error)
    return {}
  }
}

// Unified translation getter
export const getTranslation = async (
  instance: typeof i18n,
  language: string,
  key: string,
  namespace: string = "common"
): Promise<string> => {
  try {
    const translations = await loadTranslations(instance, language, [namespace])
    return translations[key] || translations[`${namespace}:${key}`] || key
  } catch (error) {
    console.error("Failed to get translation:", error)
    return key
  }
}

// Pre-load all available translations for build optimization
export const preloadTranslations = async () => {
  if (typeof window !== "undefined") {
    // Client-side: preload all translations
    const preloadPromises = []

    for (const uiLang of supportedLanguages) {
      const backendLang = getBackendLanguageCode(uiLang)
      for (const namespace of i18nConfig.ns) {
        preloadPromises.push(loadLocalResource(backendLang, namespace))
      }
    }

    try {
      await Promise.all(preloadPromises)
      console.log("All translations preloaded successfully")
    } catch (error) {
      console.warn("Some translations failed to preload:", error)
    }
  }
}
