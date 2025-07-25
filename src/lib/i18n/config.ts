// Core configuration - no imports to avoid circular dependencies
export const supportedLanguages = ["en", "fr", "de", "lt", "dk"] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

// Default language
export const defaultLanguage: SupportedLanguage = "lt"

// Mapping from UI language codes to i18next language codes
export const languageCodeMapping: Record<SupportedLanguage, string> = {
  en: "en",
  fr: "fr",
  de: "de",
  lt: "lt",
  dk: "da-DK", // Map UI "dk" to i18next "da-DK"
}

// i18next configuration
export const i18nConfig = {
  debug: process.env.NODE_ENV === "development",
  fallbackLng: languageCodeMapping[defaultLanguage],
  supportedLngs: Object.values(languageCodeMapping),
  defaultNS: "common",
  ns: ["common", "navigation", "product", "cart", "checkout", "account"],
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  backend: {
    projectId: "5f861ad5-034b-4e24-8dd8-ff0f2b329332",
    apiKey: "abd728f2-06fe-48ae-8bd8-57cee71e1f50",
    referenceLng: "en",
    loadPath: "https://api.locize.app/{{projectId}}/{{version}}/{{lng}}/{{ns}}",
    addPath:
      "https://api.locize.app/missing/{{projectId}}/{{version}}/{{lng}}/{{ns}}",
    allowedAddOrUpdateHosts: ["localhost"],
  },
  saveMissing: true,
}

// Helper functions to convert between UI language codes and i18next language codes
export const getI18nextLanguageCode = (
  uiLanguageCode: SupportedLanguage
): string => {
  return languageCodeMapping[uiLanguageCode]
}

export const getUILanguageCode = (
  i18nextLanguageCode: string
): SupportedLanguage => {
  const entry = Object.entries(languageCodeMapping).find(
    ([, i18nextCode]) => i18nextCode === i18nextLanguageCode
  )
  return (entry?.[0] as SupportedLanguage) || defaultLanguage
}

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
