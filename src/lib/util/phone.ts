import {
  AsYouType,
  parsePhoneNumber,
  isValidPhoneNumber,
} from "libphonenumber-js"

/**
 * Formats a phone number to E.164 format using libphonenumber-js
 * @param phoneNumber - The phone number to format
 * @param defaultCountry - Default country code (e.g., 'LT', 'UA', 'US')
 * @returns Formatted phone number in E.164 format or original if invalid
 */
export function formatToE164(
  phoneNumber: string,
  defaultCountry: string = "LT"
): string {
  if (!phoneNumber) return ""

  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any)
    if (parsed && isValidPhoneNumber(phoneNumber, defaultCountry as any)) {
      return parsed.format("E.164")
    }
  } catch (error) {
    // If parsing fails, try without country code
    try {
      const parsed = parsePhoneNumber(phoneNumber)
      if (parsed && parsed.isValid()) {
        return parsed.format("E.164")
      }
    } catch (error) {
      // Return original if all parsing attempts fail
      return phoneNumber
    }
  }

  return phoneNumber
}

/**
 * Formats a phone number for display using libphonenumber-js AsYouType
 * @param phoneNumber - The phone number to format
 * @param defaultCountry - Default country code (e.g., 'LT', 'UA', 'US')
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(
  phoneNumber: string,
  defaultCountry: string = "LT"
): string {
  if (!phoneNumber) return ""

  try {
    // First try to parse and format as international
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any)
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational()
    }
  } catch (error) {
    // If parsing fails, use AsYouType for progressive formatting
    try {
      const asYouType = new AsYouType(defaultCountry as any)
      return asYouType.input(phoneNumber)
    } catch (error) {
      // Return original if all formatting attempts fail
      return phoneNumber
    }
  }

  // Fallback to AsYouType
  try {
    const asYouType = new AsYouType(defaultCountry as any)
    return asYouType.input(phoneNumber)
  } catch (error) {
    return phoneNumber
  }
}
