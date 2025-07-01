// Mapping from language codes to country codes
const languageToCountryMap: Record<string, string> = {
  en: "us", // English -> United States
  fr: "fr", // French -> France
  de: "de", // German -> Germany
  lt: "lt", // Lithuanian -> Lithuania
}

export function getCountryCodeFromLanguage(languageCode: string): string {
  return languageToCountryMap[languageCode] || "us"
}

export function getLanguageCodeFromCountry(countryCode: string): string {
  const entry = Object.entries(languageToCountryMap).find(
    ([, country]) => country === countryCode
  )
  return entry ? entry[0] : "en"
}
