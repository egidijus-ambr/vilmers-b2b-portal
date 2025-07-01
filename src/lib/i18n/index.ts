// Types and constants (safe for server-side)
export type SupportedLanguage = "en" | "es" | "fr" | "de" | "lt"

export const supportedLanguages: readonly SupportedLanguage[] = [
  "en",
  "es",
  "fr",
  "de",
  "lt",
] as const
export const defaultLanguage: SupportedLanguage = "en"

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
  ServerTranslation,
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

// Utility functions
export const getLanguageFromPath = (
  pathname: string
): SupportedLanguage | null => {
  const segments = pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]

  if (
    firstSegment &&
    supportedLanguages.includes(firstSegment as SupportedLanguage)
  ) {
    return firstSegment as SupportedLanguage
  }

  return null
}

export const removeLanguageFromPath = (pathname: string): string => {
  const segments = pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]

  if (
    firstSegment &&
    supportedLanguages.includes(firstSegment as SupportedLanguage)
  ) {
    return "/" + segments.slice(1).join("/")
  }

  return pathname
}

export const addLanguageToPath = (
  pathname: string,
  language: SupportedLanguage
): string => {
  const cleanPath = removeLanguageFromPath(pathname)
  return `/${language}${cleanPath === "/" ? "" : cleanPath}`
}

// Server-side utilities
export const detectLanguageFromHeaders = (
  acceptLanguage?: string
): SupportedLanguage => {
  if (!acceptLanguage) return defaultLanguage

  const languages = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().split("-")[0])
    .filter((lang) => supportedLanguages.includes(lang as SupportedLanguage))

  return (languages[0] as SupportedLanguage) || defaultLanguage
}

// Translation key helpers for better TypeScript support
export const createTranslationKey = <T extends string>(
  namespace: string,
  key: T
) => {
  return `${namespace}:${key}` as const
}

// Common translation keys (for better IDE support)
export const TRANSLATION_KEYS = {
  COMMON: {
    LOADING: "common:loading",
    ERROR: "common:error",
    SUCCESS: "common:success",
    CANCEL: "common:cancel",
    SAVE: "common:save",
    EDIT: "common:edit",
    DELETE: "common:delete",
  },
  NAVIGATION: {
    HOME: "navigation:home",
    PRODUCTS: "navigation:products",
    CART: "navigation:cart",
    ACCOUNT: "navigation:account",
  },
  PRODUCT: {
    ADD_TO_CART: "product:addToCart",
    OUT_OF_STOCK: "product:outOfStock",
    IN_STOCK: "product:inStock",
  },
  CART: {
    TITLE: "cart:title",
    EMPTY: "cart:empty",
    CHECKOUT: "cart:proceedToCheckout",
  },
  ACCOUNT: {
    LOGIN: "account:login",
    REGISTER: "account:register",
    PROFILE: "account:profile",
  },
} as const
