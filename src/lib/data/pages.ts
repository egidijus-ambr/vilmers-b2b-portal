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

// When a page_grid block has show_tags enabled we load the ENTIRE in-scope set
// (no max_pages cap) so the pill row and server-side tag filter operate over all
// matching articles. For children mode this means raising the GraphQL `take`
// well above any configured max_pages.
const SHOW_TAGS_CHILD_TAKE = 1000

export async function enrichContentBlocksWithPages(
  blocks: ContentBlock[],
  language: string,
  currentPageId?: string,
  selectedTagSlug?: string | null
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
  //    set) else the current page. Fetch each DISTINCT parent's children once,
  //    using a per-parent `take`. For show_tags blocks we must load ALL children
  //    (not just max_pages) so the pill list + tag filter see the full set; a
  //    parent referenced by any show_tags block therefore gets the large take.
  const childTakeByParent = new Map<string, number>()
  for (const block of blocks) {
    if (block.type !== "page_grid") continue
    const config = block.config as {
      mode?: string
      max_pages?: number
      parent_id?: string | null
      show_tags?: boolean
    } | null
    if (config?.mode !== "children") continue
    const parentId = config?.parent_id || currentPageId
    if (!parentId) continue
    const take = config?.show_tags
      ? SHOW_TAGS_CHILD_TAKE
      : Math.max(8, config?.max_pages ?? 8)
    childTakeByParent.set(
      parentId,
      Math.max(childTakeByParent.get(parentId) ?? 0, take)
    )
  }

  const childPagesByParent = new Map<string, GridPage[]>()
  if (childTakeByParent.size > 0) {
    await Promise.all(
      Array.from(childTakeByParent.entries()).map(async ([parentId, take]) => {
        try {
          const children = await sdk.pages.getChildPages(
            parentId,
            language,
            take
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

  // 4. Attach grid_pages (and, for show_tags blocks, grid_tags) per block
  return blocks.map((block) => {
    if (block.type !== "page_grid") {
      return block
    }

    const config = (block.config ?? null) as {
      mode?: string
      max_pages?: number
      page_ids?: string[]
      parent_id?: string | null
      show_tags?: boolean
    } | null
    const mode = config?.mode ?? "manual"
    const maxPages = config?.max_pages ?? 8
    const showTags = Boolean(config?.show_tags)

    // All in-scope pages for this block, BEFORE any max_pages cap or tag filter.
    let scopedPages: GridPage[] = []
    if (mode === "children") {
      const parentId = config?.parent_id || currentPageId
      scopedPages = parentId ? childPagesByParent.get(parentId) ?? [] : []
    } else {
      // manual (default)
      const ids = Array.isArray(config?.page_ids) ? config!.page_ids : []
      scopedPages = ids
        .map((id) => pageMap.get(id))
        .filter((page): page is GridPage => page != null)
    }

    if (!showTags) {
      // Unchanged behavior: slice by max_pages, no pills, no filtering.
      return {
        ...block,
        grid_pages: scopedPages.slice(0, maxPages),
      }
    }

    // show_tags: distinct tags across ALL in-scope pages (computed before the
    // tag filter so selecting a pill never collapses the pill row). Deduped by
    // id and sorted by first profile name for a deterministic, locale-stable
    // pill order.
    const tagsById = new Map<string, NonNullable<GridPage["tags"]>[number]>()
    for (const page of scopedPages) {
      for (const tag of page.tags ?? []) {
        const id = String(tag.id)
        if (!tagsById.has(id)) tagsById.set(id, tag)
      }
    }
    const gridTags = Array.from(tagsById.values()).sort((a, b) => {
      const an = a.page_tag_profiles?.[0]?.name ?? ""
      const bn = b.page_tag_profiles?.[0]?.name ?? ""
      return an.localeCompare(bn)
    })

    // Filtered grid: only pages whose tags include the selected slug. No
    // selection => all in-scope pages.
    const gridPages = selectedTagSlug
      ? scopedPages.filter((p) =>
          p.tags?.some((t) => t.slug === selectedTagSlug)
        )
      : scopedPages

    return {
      ...block,
      grid_pages: gridPages,
      grid_tags: gridTags,
    }
  })
}
