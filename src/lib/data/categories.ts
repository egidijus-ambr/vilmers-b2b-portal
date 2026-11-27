import { unstable_cache } from "next/cache"
import { sdk } from "@lib/config"
import { CategoryData, ContentBlock } from "@lib/furnisystems-sdk"
import {
  mapV1Category,
  mapV1CategoryList,
} from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { normalizeLanguage } from "@lib/i18n/config"
import { CMS_FLUSH_TAG, runCmsCall, seg, v1Lang, v1SessionGet, v1SharedGet } from "./cms-v1"

/**
 * Taxonomy on REST v1 (slice 4).
 *
 * Menu and category tiles: GET /catalog/categories/menu and
 * /catalog/categories?ids are the SAME for every caller (no session at all
 * on the backend), so they are read without a bearer on every transport and
 * cached with unstable_cache for 300 s (the backend's own max-age), also
 * busted by the backend's B2B flush tag. A failure throws inside the cache
 * (never cached) and gives [] here, as a GraphQL error did.
 *
 * Category page: GET /catalog/categories/by-permalink/:permalink depends on
 * the session (content-block links to private CMS pages are null for a
 * guest), so it is per request with the session's bearer, never cached;
 * GraphQL for legacy-only sessions / a v1 401; 404 or any other failure ->
 * null (not-found page).
 */
const TAXONOMY_TTL_SECONDS = 300

const cachedMenu = unstable_cache(
  async (language: string): Promise<CategoryData[]> =>
    mapV1CategoryList(
      await v1SharedGet<{ data: unknown[] }>("/catalog/categories/menu", {
        language,
      })
    ),
  ["v1-category-menu"],
  { revalidate: TAXONOMY_TTL_SECONDS, tags: ["category-menu", CMS_FLUSH_TAG] }
)

export const listMenuCategories = async (
  language?: string
): Promise<CategoryData[]> => {
  try {
    return await cachedMenu(normalizeLanguage(language))
  } catch (error) {
    console.error("Error fetching menu categories:", error)
    return []
  }
}

export const getCategoryByPermalink = async (
  permalink: string,
  language?: string
): Promise<CategoryData | null> =>
  runCmsCall<CategoryData | null>(`category ${permalink}`, {
    v1: async (bearer) =>
      mapV1Category(
        await v1SessionGet(
          bearer,
          `/catalog/categories/by-permalink/${seg(permalink)}`,
          { language: v1Lang(normalizeLanguage(language)) }
        )
      ),
    graphql: () => getCategoryByPermalinkGraphql(permalink, language),
    onError: () => null,
  })

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getCategoryByPermalinkGraphql(
  permalink: string,
  language?: string
): Promise<CategoryData | null> {
  try {
    return await sdk.categories.getCategoryByPermalink(permalink, language)
  } catch (error) {
    console.error(`Error fetching category by permalink "${permalink}":`, error)
    return null
  }
}

/** v1 `ids` bound (cmsSchemas MAX_CATEGORY_IDS). */
const MAX_CATEGORY_IDS = 100

const cachedCategoriesByIds = unstable_cache(
  async (idsCsv: string, language: string): Promise<CategoryData[]> =>
    mapV1CategoryList(
      await v1SharedGet<{ data: unknown[] }>("/catalog/categories", {
        ids: idsCsv,
        language,
      })
    ),
  ["v1-categories-by-ids"],
  { revalidate: TAXONOMY_TTL_SECONDS, tags: ["category-tiles", CMS_FLUSH_TAG] }
)

export const getCategoriesByIds = async (
  ids: number[],
  language?: string
): Promise<CategoryData[]> => {
  const valid = Array.from(
    new Set(ids.filter((id) => Number.isInteger(id) && id > 0 && id <= 2147483647))
  ).sort((a, b) => a - b)
  if (valid.length === 0) return []
  try {
    const lang = normalizeLanguage(language)
    const chunks: number[][] = []
    for (let i = 0; i < valid.length; i += MAX_CATEGORY_IDS) {
      chunks.push(valid.slice(i, i + MAX_CATEGORY_IDS))
    }
    const lists = await Promise.all(
      chunks.map((c) => cachedCategoriesByIds(c.join(","), lang))
    )
    return lists.flat()
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
