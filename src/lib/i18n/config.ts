// Core configuration - no imports to avoid circular dependencies
export const supportedLanguages = ["en", "fr", "de", "lt", "da"] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

// Default language
export const defaultLanguage: SupportedLanguage = "lt"

// Mapping for backend translation loading (now uses local file structure)
export const backendLanguageMapping: Record<SupportedLanguage, string> = {
  en: "en",
  fr: "fr",
  de: "de",
  lt: "lt",
  da: "da", // Local files use da for Danish
}

// i18next configuration
export const i18nConfig = {
  debug: process.env.NODE_ENV === "development",
  fallbackLng: backendLanguageMapping[defaultLanguage],
  supportedLngs: [...Object.values(backendLanguageMapping)],
  defaultNS: "common",
  ns: ["common", "account"],
  interpolation: {
    escapeValue: false, // React already escapes values
  },
}

// Helper functions to convert between UI language codes and backend language codes
export const getBackendLanguageCode = (
  uiLanguageCode: SupportedLanguage
): string => {
  return backendLanguageMapping[uiLanguageCode]
}

export const getUILanguageCodeFromBackend = (
  backendLanguageCode: string
): SupportedLanguage => {
  const entry = Object.entries(backendLanguageMapping).find(
    ([, backendCode]) => backendCode === backendLanguageCode
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
    .map((lang) => {
      const langCode = lang.split(";")[0].trim().split("-")[0]
      // Map Danish language codes to our supported "da" code
      if (langCode === "dk") return "da"
      return langCode
    })
    .filter((lang) => supportedLanguages.includes(lang as SupportedLanguage))

  return (languages[0] as SupportedLanguage) || defaultLanguage
}
