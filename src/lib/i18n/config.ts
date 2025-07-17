// Define supported languages
export const supportedLanguages = ["en", "fr", "de", "lt", "dk"] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

// Mapping from UI language codes to i18next language codes
export const languageCodeMapping: Record<SupportedLanguage, string> = {
  en: "en",
  fr: "fr",
  de: "de",
  lt: "lt",
  dk: "da-DK", // Map UI "dk" to i18next "da-DK"
}

// Default language
export const defaultLanguage: SupportedLanguage = "lt"

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
