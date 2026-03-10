const SITE_TO_CATALOGUE: Record<string, string> = {
  en: "EN",
  de: "DE",
  fr: "EN", // fr falls back to English
}

export function getCatalogueLanguage(siteLanguage: string): string {
  return SITE_TO_CATALOGUE[siteLanguage] || "EN"
}
