import { sdk } from "@lib/config"
import { CategoryData, ContentBlock } from "@lib/furnisystems-sdk"

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

export const getCategoriesByIds = async (
  ids: number[],
  language?: string
): Promise<CategoryData[]> => {
  try {
    return await sdk.categories.getCategoriesByIds(ids, language)
  } catch (error) {
    console.error("Error fetching categories by IDs:", error)
    return []
  }
}

export async function enrichContentBlocksWithTileCategories(
  blocks: ContentBlock[],
  language: string
): Promise<ContentBlock[]> {
  // 1. Collect all unique category_ids from category_tiles blocks
  const allCategoryIds = new Set<number>()

  for (const block of blocks) {
    if (
      block.type === "category_tiles" &&
      block.config &&
      Array.isArray((block.config as Record<string, unknown>).category_ids)
    ) {
      const ids = (block.config as Record<string, unknown>).category_ids as number[]
      for (const id of ids) {
        allCategoryIds.add(id)
      }
    }
  }

  // 2. If no category_ids found, return blocks as-is
  if (allCategoryIds.size === 0) {
    return blocks
  }

  // 3. Fetch all needed categories in ONE query
  const categories = await getCategoriesByIds(
    Array.from(allCategoryIds),
    language
  )

  // Build a lookup map for quick access
  const categoryMap = new Map<number, CategoryData>()
  for (const category of categories) {
    categoryMap.set(category.id, category)
  }

  // 4. Attach matching categories to each category_tiles block
  return blocks.map((block) => {
    if (
      block.type !== "category_tiles" ||
      !block.config ||
      !Array.isArray((block.config as Record<string, unknown>).category_ids)
    ) {
      return block
    }

    const ids = (block.config as Record<string, unknown>).category_ids as number[]
    const matchedCategories = ids
      .map((id) => categoryMap.get(id))
      .filter((cat): cat is CategoryData => cat != null)

    return {
      ...block,
      categories: matchedCategories,
    }
  })
}
