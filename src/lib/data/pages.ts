import { unstable_cache } from "next/cache"
import { sdk } from "@lib/config"
import { ContentBlock, Page } from "@lib/furnisystems-sdk"
import type { GridPage } from "@modules/home/components/content-block/types"

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

export const getPageByPath = async (
  path: string,
  language: string
): Promise<Page | null> => {
  const cached = unstable_cache(
    async () => {
      try {
        const page = await sdk.pages.getPageByPath(path, language)
        return page
      } catch (error) {
        console.error(`Error fetching page with path "${path}":`, error)
        return null
      }
    },
    [`page-path-${path}-${language}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}

export async function enrichContentBlocksWithPages(
  blocks: ContentBlock[],
  language: string,
  currentPageId?: string
): Promise<ContentBlock[]> {
  // 1. Bail out early if there is nothing to enrich
  if (!blocks.some((block) => block.type === "page_grid")) {
    return blocks
  }

  // 2. MANUAL mode — collect all unique page_ids across page_grid blocks and
  //    batch-fetch them once, then map per block in config order.
  const allPageIds = new Set<string>()
  for (const block of blocks) {
    const config = (block.config ?? null) as {
      mode?: string
      page_ids?: string[]
    } | null
    const mode = config?.mode ?? "manual"
    if (
      block.type === "page_grid" &&
      mode === "manual" &&
      Array.isArray(config?.page_ids)
    ) {
      for (const id of config!.page_ids) {
        allPageIds.add(id)
      }
    }
  }

  let pageMap = new Map<string, GridPage>()
  if (allPageIds.size > 0) {
    try {
      const pages = await sdk.pages.getPagesByIds(
        Array.from(allPageIds),
        language
      )
      for (const page of pages) {
        pageMap.set(page.id, page)
      }
    } catch (error) {
      console.error("Error fetching pages for page_grid blocks:", error)
      pageMap = new Map<string, GridPage>()
    }
  }

  // 3. CHILDREN mode — each children block's parent is config.parent_id (if
  //    set) else the current page. Fetch each DISTINCT parent's children once.
  const childrenParentIds = new Set<string>()
  let maxChildTake = 8
  for (const block of blocks) {
    if (block.type !== "page_grid") continue
    const config = block.config as {
      mode?: string
      max_pages?: number
      parent_id?: string | null
    } | null
    if (config?.mode !== "children") continue
    maxChildTake = Math.max(maxChildTake, config?.max_pages ?? 8)
    const parentId = config?.parent_id || currentPageId
    if (parentId) childrenParentIds.add(parentId)
  }

  const childPagesByParent = new Map<string, GridPage[]>()
  if (childrenParentIds.size > 0) {
    await Promise.all(
      Array.from(childrenParentIds).map(async (parentId) => {
        try {
          const children = await sdk.pages.getChildPages(
            parentId,
            language,
            maxChildTake
          )
          childPagesByParent.set(parentId, children)
        } catch (error) {
          console.error(
            `Error fetching child pages for page "${parentId}":`,
            error
          )
          childPagesByParent.set(parentId, [])
        }
      })
    )
  }

  // 4. Attach grid_pages to each page_grid block
  return blocks.map((block) => {
    if (block.type !== "page_grid") {
      return block
    }

    const config = (block.config ?? null) as {
      mode?: string
      max_pages?: number
      page_ids?: string[]
      parent_id?: string | null
    } | null
    const mode = config?.mode ?? "manual"
    const maxPages = config?.max_pages ?? 8

    let gridPages: GridPage[] = []

    if (mode === "children") {
      const parentId = config?.parent_id || currentPageId
      const children = parentId
        ? childPagesByParent.get(parentId) ?? []
        : []
      gridPages = children.slice(0, maxPages)
    } else {
      // manual (default)
      const ids = Array.isArray(config?.page_ids) ? config!.page_ids : []
      gridPages = ids
        .map((id) => pageMap.get(id))
        .filter((page): page is GridPage => page != null)
        .slice(0, maxPages)
    }

    return {
      ...block,
      grid_pages: gridPages,
    }
  })
}
