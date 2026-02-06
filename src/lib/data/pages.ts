import { unstable_cache } from "next/cache"
import { sdk } from "@lib/config"
import { Page } from "@lib/furnisystems-sdk"

const PAGE_CACHE_TAG = "cms-pages"

export const getPageByCode = async (
  code: string,
  language?: string
): Promise<Page | null> => {
  const cached = unstable_cache(
    async () => {
      try {
        const page = await sdk.pages.getPageByCode(code, language)
        return page
      } catch (error) {
        console.error(`Error fetching page with code "${code}":`, error)
        return null
      }
    },
    [`page-${code}-${language ?? "default"}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}

export const getPageBySlug = async (
  slug: string,
  language?: string
): Promise<Page | null> => {
  const cached = unstable_cache(
    async () => {
      try {
        const page = await sdk.pages.getPageBySlug(slug, language)
        return page
      } catch (error) {
        console.error(`Error fetching page with slug "${slug}":`, error)
        return null
      }
    },
    [`page-slug-${slug}-${language ?? "default"}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}
