import { isEmpty } from "./isEmpty"
import { SupportedLanguage } from "@lib/i18n"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}

/**
 * Maps supported language codes to their corresponding locale strings
 */
export const getLocaleFromLanguage = (language: SupportedLanguage): string => {
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    lt: "lt-LT",
  }
  return localeMap[language] || "en-US"
}

/**
 * Formats a price with proper currency and locale formatting
 * Defaults to EUR currency if no currency_code is provided
 */
type FormatPriceParams = {
  amount: number
  currency_code?: string
  language: SupportedLanguage
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export const formatPrice = ({
  amount,
  currency_code = "EUR",
  language,
  minimumFractionDigits,
  maximumFractionDigits,
}: FormatPriceParams) => {
  const locale = getLocaleFromLanguage(language)

  return convertToLocale({
    amount,
    currency_code,
    locale,
    minimumFractionDigits,
    maximumFractionDigits,
  })
}
