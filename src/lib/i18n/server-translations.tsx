import { getServerTranslations, getServerTranslation } from "./server-config"
import {
  getLanguageFromPath,
  defaultLanguage,
  SupportedLanguage,
} from "./index"

// Server-side translation component
interface ServerTranslationProps {
  translationKey: string
  namespace?: string
  fallback?: string
  children?: React.ReactNode
}

export async function ServerTranslation({
  translationKey,
  namespace = "common",
  fallback,
}: ServerTranslationProps) {
  const language = await getServerLanguage()
  const translation = await getServerTranslation(
    language,
    translationKey,
    namespace
  )

  return <>{translation || fallback || translationKey}</>
}

// Server-side translation hook for server components
export async function getServerLanguage(): Promise<SupportedLanguage> {
  // For now, return default language on server-side
  // This can be enhanced later with proper server-side language detection
  return defaultLanguage
}

// Server-side translation function for use in server components
export async function getServerT(namespace: string = "common") {
  const language = await getServerLanguage()
  const translations = await getServerTranslations(language, [namespace])

  return (key: string, fallback?: string) => {
    const fullKey = namespace === "common" ? key : `${namespace}:${key}`
    return translations[key] || translations[fullKey] || fallback || key
  }
}

// Pre-load translations for a page (to be used in layouts or pages)
export async function preloadTranslations(
  namespaces: string[] = ["common"],
  language?: string
) {
  const lang = language || (await getServerLanguage())
  return await getServerTranslations(lang, namespaces)
}
