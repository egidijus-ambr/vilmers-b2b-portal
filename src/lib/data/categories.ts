import { sdk } from "@lib/config"
import { CategoryData } from "@lib/furnisystems-sdk"

export const listMenuCategories = async (
  language?: string
): Promise<CategoryData[]> => {
  try {
    return await sdk.categories.getMenuCategories(language)
  } catch (error) {
    console.error("Error fetching menu categories:", error)
    return []
  }
}

export const getCategoryByPermalink = async (
  permalink: string,
  language?: string
): Promise<CategoryData | null> => {
  try {
    return await sdk.categories.getCategoryByPermalink(permalink, language)
  } catch (error) {
    console.error(`Error fetching category by permalink "${permalink}":`, error)
    return null
  }
}
