import { cache } from "react"
import { unstable_cache } from "next/cache"
import { sdk } from "@lib/config"
import { ContentBlock, Page, PageResult } from "@lib/furnisystems-sdk"
import type { GridPage } from "@modules/home/components/content-block/types"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import {
  classifyV1PageError,
  mapV1CmsPage,
  mapV1ListData,
  pageResultForOutcome,
} from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { isSupportedLanguage } from "@lib/i18n/config"
import { getAuthHeaders } from "./cookies"
import {
  cmsRequestContext,
  runCmsCall,
  seg,
  v1Lang,
  v1SessionGet,
  v1SharedGet,
} from "./cms-v1"
import { describeV1Error } from "./me-v1"

/*
 * CMS pages on REST v1 (slice 5). Transport per ./v1-transport-rule.ts.
 *
 * unstable_cache is used ONLY for the GUEST answer (no bearer, no acting
 * header, no BFF headers: v1SharedGet) of by-code / by-slug / by-path, which
 * is identical for every guest and never contains a private page (the
 * backend answers 404 / 401 PRIVATE_PAGE instead). Anything fetched with a
 * session bearer is per request (React `cache` at most). The GraphQL path
 * (legacy-only sessions) keeps its own, always-anonymous cached lookups
 * under its own keys: its blocks carry `grid_product_containers`, the v1
 * ones do not, so the two must never share an entry.
 *
 * Private pages (getPageByPath / getPageByPathAuthed):
 *   guest       v1 401 PRIVATE_PAGE -> the PRIVATE_PAGE sentinel, so
 *               [...slug]/page.tsx redirects to /<lang>/account?returnTo=...
 *               exactly as for the GraphQL PRIVATE_PAGE error (the login flow
 *               validates returnTo: same-origin paths only). 404 -> null
 *               (not-found). Today's deployed backend still answers 404 for a
 *               guest on a private page (=> not-found until the backend's
 *               401 PRIVATE_PAGE change is deployed).
 *   v1 session  after the sentinel, getPageByPathAuthed makes the lookup
 *               WITH the bearer (a portal session sees private pages),
 *               uncached, shared by the layout and the page through React
 *               cache. Until the backend's 401 change is deployed a private
 *               page is a guest 404 -> not-found for EVERYONE, logged-in
 *               users included (deploy order: backend first), and those
 *               guest 404s are cached without TTL: fire the `cms-pages`
 *               revalidate (or bump V1_PAGE_SCHEMA_VERSION) after it.
 *   other 401   GraphQL for that call. Other v1 failures: no page (not-found),
 *               never cached.
 */

const PAGE_CACHE_TAG = "cms-pages"

// Bump this whenever a field is added to/removed from the pages module's
// ContentBlockFields fragment (pages/index.ts). unstable_cache's Data Cache
// entries below are keyed only by code/slug/path + language with no TTL
// (tag-only revalidation via PAGE_CACHE_TAG / the /api/revalidate route,
// fired on page edits) — a fragment change alone does NOT invalidate
// existing entries, so a stale entry cached before a field was added would
// serve pre-change shape forever. Changing this suffix forces fresh keys.
// Bumped 2026-09-28 for ContentBlock.grid_product_containers.
const CONTENT_BLOCK_SCHEMA_VERSION = "cb2"
/** Version of the v1 (guest) cache entries; separate keys from GraphQL's. */
const V1_PAGE_SCHEMA_VERSION = "v1p1"

/**
 * One guest v1 page lookup for unstable_cache: 404 -> null and 401
 * PRIVATE_PAGE -> the sentinel are cacheable answers; anything else THROWS
 * (5xx, 429, network: never cached).
 */
async function sharedPageLookup(
  path: string,
  query: Record<string, string>
): Promise<PageResult | null> {
  try {
    return mapV1CmsPage(await v1SharedGet(path, query))
  } catch (error) {
    if (isV1ProblemError(error)) {
      const known = pageResultForOutcome(classifyV1PageError(error.status, error.code))
      if (known !== undefined) return known
    }
    throw error
  }
}

/** Guest lookups by code / slug never yield the sentinel (other routes 404). */
const asPage = (r: PageResult | null): Page | null =>
  r && !("restricted" in r) ? (r as Page) : null

export const getPageByCode = async (
  code: string,
  language?: string
): Promise<Page | null> => {
  const ctx = await cmsRequestContext()
  if (ctx.transport === "graphql") return getPageByCodeGraphql(code, language)
  if (!isSupportedLanguage(language)) return null
  const lang = v1Lang(language)
  const cached = unstable_cache(
    async () =>
      sharedPageLookup(`/catalog/pages/by-code/${seg(code)}`, { language: lang }),
    [`v1-page-code-${code}-${lang}-${V1_PAGE_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  try {
    return asPage(await cached())
  } catch (error) {
    console.error(`Error fetching page with code "${code}":`, describeV1Error(error))
    return null
  }
}

function getPageByCodeGraphql(code: string, language?: string): Promise<Page | null> {
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
    [`page-${code}-${language ?? "default"}-${CONTENT_BLOCK_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}

export const getPageBySlug = async (
  slug: string,
  language?: string
): Promise<Page | null> => {
  const ctx = await cmsRequestContext()
  if (ctx.transport === "graphql") return getPageBySlugGraphql(slug, language)
  if (!isSupportedLanguage(language)) return null
  const lang = v1Lang(language)
  const cached = unstable_cache(
    async () =>
      sharedPageLookup(`/catalog/pages/by-slug/${seg(slug)}`, { language: lang }),
    [`v1-page-slug-${slug}-${lang}-${V1_PAGE_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  try {
    return asPage(await cached())
  } catch (error) {
    console.error(`Error fetching page with slug "${slug}":`, describeV1Error(error))
    return null
  }
}

function getPageBySlugGraphql(slug: string, language?: string): Promise<Page | null> {
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
    [`page-slug-${slug}-${language ?? "default"}-${CONTENT_BLOCK_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}

/**
 * The page at `path`: ALWAYS the anonymous lookup, as before (v1: the
 * cached guest answer; legacy-only sessions: the cached anonymous GraphQL
 * lookup). A private page comes back as the PRIVATE_PAGE sentinel; the
 * callers ([...slug]/page.tsx, the (main) layout) then make the
 * authenticated lookup (getPageByPathAuthed) or redirect to login, exactly
 * as for the GraphQL PRIVATE_PAGE error. Deliberately no bearer call here:
 * the layout runs this on EVERY route (products, categories, ...), so a
 * per-session lookup would add an uncached backend call to each page view.
 */
export const getPageByPath = async (
  path: string,
  language: string
): Promise<PageResult | null> => {
  const ctx = await cmsRequestContext()
  if (ctx.transport === "graphql") return getPageByPathGraphql(path, language)
  if (!isSupportedLanguage(language)) return null
  const lang = v1Lang(language)
  const cached = unstable_cache(
    async () => sharedPageLookup("/catalog/pages/by-path", { path, language: lang }),
    [`v1-page-path-${path}-${lang}-${V1_PAGE_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  try {
    return await cached()
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401) {
      // Not PRIVATE_PAGE (handled inside): cannot happen without a bearer;
      // the old anonymous lookup then.
      return getPageByPathGraphql(path, language)
    }
    console.error(`Error fetching page with path "${path}":`, describeV1Error(error))
    return null
  }
}

function getPageByPathGraphql(
  path: string,
  language: string
): Promise<PageResult | null> {
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
    [`page-path-${path}-${language}-${CONTENT_BLOCK_SCHEMA_VERSION}`],
    { tags: [PAGE_CACHE_TAG] }
  )
  return cached()
}

// Deliberately NOT unstable_cache-wrapped: this is the authenticated lookup
// for private pages (see [...slug]/page.tsx). Its result can carry full
// private page content, and an unstable_cache Data Cache entry is shared
// across all visitors regardless of auth state.
//
// Wrapped in React's cache() for per-request memoization only (request-scoped,
// never shared across users or requests). Both the shared layout (chromeless
// detection) and the page component call this for the same path/language.
//
// v1: GET /catalog/pages/by-path with the session's bearer. GraphQL
// (legacy-only sessions, a v1 session without a bearer, a v1 401 other than
// PRIVATE_PAGE): the token-authenticated GraphQL lookup, unchanged.
export const getPageByPathAuthed = cache(
  async (path: string, language: string): Promise<PageResult | null> => {
    const ctx = await cmsRequestContext()
    if (ctx.transport === "v1" && ctx.bearer && isSupportedLanguage(language)) {
      try {
        return mapV1CmsPage(
          await v1SessionGet(ctx.bearer, "/catalog/pages/by-path", {
            path,
            language: v1Lang(language),
          })
        )
      } catch (error) {
        const outcome = isV1ProblemError(error)
          ? classifyV1PageError(error.status, error.code)
          : "error"
        const known = pageResultForOutcome(outcome)
        if (known !== undefined) return known
        if (outcome !== "fallback") {
          console.error(
            `Error fetching private page with path "${path}":`,
            describeV1Error(error)
          )
          return null
        }
        console.warn(`[cms-v1] page ${path}: 401, using the GraphQL path`)
      }
    }
    try {
      const authHeaders: Record<string, string> = {
        ...(await getAuthHeaders()),
      }
      return await sdk.pages.getPageByPath(path, language, authHeaders)
    } catch (error) {
      console.error(`Error fetching private page with path "${path}":`, error)
      return null
    }
  }
)

/** v1 `ids` bound (cmsSchemas MAX_PAGE_IDS). */
const MAX_PAGE_IDS = 100
const PAGE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
/** Backend CHILD_PAGES_MAX. */
const MAX_CHILD_TAKE = 1000

/**
 * page_grid cards by id, in the order of `ids` (session-dependent: private
 * pages are only in a portal session's answer). Per request, never cached.
 */
async function getPagesByIds(ids: string[], language: string): Promise<GridPage[]> {
  return runCmsCall<GridPage[]>("pages by ids", {
    v1: async (bearer) => {
      if (!isSupportedLanguage(language)) return []
      const valid = ids.filter((id) => PAGE_ID_RE.test(id))
      const out: GridPage[] = []
      for (let i = 0; i < valid.length; i += MAX_PAGE_IDS) {
        const chunk = valid.slice(i, i + MAX_PAGE_IDS)
        out.push(
          ...mapV1ListData<GridPage>(
            await v1SessionGet(bearer, "/catalog/pages", {
              ids: chunk.join(","),
              language: v1Lang(language),
            })
          )
        )
      }
      return out
    },
    graphql: () => sdk.pages.getPagesByIds(ids, language),
    onError: () => [],
  })
}

/** Published children of a page, by arrangement (session-dependent). */
async function getChildPages(
  parentId: string,
  language: string,
  take: number
): Promise<GridPage[]> {
  return runCmsCall<GridPage[]>(`children of ${parentId}`, {
    v1: async (bearer) => {
      if (!isSupportedLanguage(language) || !PAGE_ID_RE.test(parentId)) return []
      return mapV1ListData<GridPage>(
        await v1SessionGet(bearer, `/catalog/pages/${seg(parentId)}/children`, {
          language: v1Lang(language),
          take: Math.min(Math.max(1, Math.floor(take)), MAX_CHILD_TAKE),
        })
      )
    },
    graphql: () => sdk.pages.getChildPages(parentId, language, take),
    onError: () => [],
  })
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
      const pages = await getPagesByIds(Array.from(allPageIds), language)
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
          const children = await getChildPages(parentId, language, take)
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
