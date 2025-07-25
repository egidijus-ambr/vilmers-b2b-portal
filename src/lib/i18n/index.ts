// Re-export types and constants from config (no circular dependencies)
export type { SupportedLanguage } from "./config"
export {
  supportedLanguages,
  defaultLanguage,
  languageCodeMapping,
  getI18nextLanguageCode,
  getUILanguageCode,
  getLanguageFromPath,
  removeLanguageFromPath,
  addLanguageToPath,
  detectLanguageFromHeaders,
} from "./config"

// Provider and hooks
export {
  I18nProvider,
  useI18n,
  useTranslations,
  useLanguageDetection,
} from "./provider"

// Server-side utilities
export { getServerTranslations, getServerTranslation } from "./server-config"
export {
  getServerLanguage,
  getServerT,
  preloadTranslations,
} from "./server-translations"

// Components
export {
  LanguageSwitcher,
  CompactLanguageSwitcher,
} from "./components/language-switcher"
export { TranslationDemo } from "./components/translation-demo"
export {
  ServerTranslation,
  createServerT,
} from "./components/server-translation"

// Translation key helpers for better TypeScript support
export const createTranslationKey = <T extends string>(
  namespace: string,
  key: T
) => {
  return `${namespace}:${key}` as const
}
