import { sdk } from "@lib/config"
import { Page } from "@lib/furnisystems-sdk"

export const getPageByCode = async (
  code: string,
  language?: string
): Promise<Page | null> => {
  try {
    const page = await sdk.pages.getPageByCode(code, language)
    return page
  } catch (error) {
    console.error(`Error fetching page with code "${code}":`, error)
    return null
  }
}
