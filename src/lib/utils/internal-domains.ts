/**
 * List of internal domain patterns that should open within PWA (target="_self")
 * instead of opening in a new tab
 */
export const INTERNAL_DOMAIN_PATTERNS = [
  /\.furnisystems\.com$/, // *.furnisystems.com
  /^furnisystems\.com$/, // furnisystems.com
  /^shop\.vilmers\.com$/, // shop.vilmers.com
  /^my\.vilmers\.com$/, // my.vilmers.com
  /^dev\.my\.vilmers\.com$/, // dev.my.vilmers.com
  /^localhost$/, // localhost
  /^127\.0\.0\.1$/, // 127.0.0.1
]

/**
 * Helper function to check if URL is an internal domain
 * @param url - The URL to check
 * @returns true if the URL hostname matches any internal domain pattern
 */
export const isInternalDomain = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    return INTERNAL_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname))
  } catch {
    // If URL parsing fails, treat as external
    return false
  }
}
