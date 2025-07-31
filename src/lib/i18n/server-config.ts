import {
  createI18nInstance,
  loadTranslations,
  getTranslation,
} from "./unified-config"

// Create server-side i18next instance using unified configuration
const createServerI18n = (language?: string) => {
  const { instance, config } = createI18nInstance({
    isServer: true,
    enableDebug: false, // Disable debug on server
    enableDetection: false, // No detection on server
    initialLanguage: language,
  })

  // Initialize the instance
  instance.init(config)
  return instance
}

// Server-side translation function using unified approach
export const getServerTranslations = async (
  language: string,
  namespaces: string[] = ["common"]
): Promise<Record<string, any>> => {
  try {
    const serverI18n = createServerI18n(language)
    return await loadTranslations(serverI18n, language, namespaces)
  } catch (error) {
    console.error("Failed to load server translations:", error)
    return {}
  }
}

// Helper function to get a specific translation using unified approach
export const getServerTranslation = async (
  language: string,
  key: string,
  namespace: string = "common"
): Promise<string> => {
  try {
    const serverI18n = createServerI18n(language)
    return await getTranslation(serverI18n, language, key, namespace)
  } catch (error) {
    console.error("Failed to get server translation:", error)
    return key
  }
}

export default createServerI18n
