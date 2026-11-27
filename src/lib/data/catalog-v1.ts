import "server-only"

/**
 * REST v1 catalogue listings (portal REST migration slice 1), behind the
 * existing data functions in ./{category-products,collection-products,
 * search-products,category-filters,products}.ts. Visibility (tags, price
 * lists, show-all, acting customer) is decided by the backend; the portal
 * only says who it is (bearer), whom it acts for (X-Acting-Customer-Id) and
 * whether the show-all cookie is set.
 *
 * Every call is `cache: "no-store"` (src/lib/furnisystems-sdk/client/v1-data.ts),
 * guests included: nothing here goes through unstable_cache or Next's data
 * cache, so a customer-specific answer can never be shared.
 */
import { cookies } from "next/headers"
import {
  isV1ProblemError,
  v1DataGet,
  withActingRetry,
  type V1Query,
} from "@lib/furnisystems-sdk/client/v1-data"
import {
  mapV1CategoryFacets,
  mapV1ProductCardPage,
  mapV1ProductCards,
  mapV1ProductNames,
  type PortalCategoryFacets,
  type V1CategoryFacets,
  type V1ProductCardList,
  type V1ProductCardPage,
  type V1ProductNames,
} from "@lib/furnisystems-sdk/modules/products/v1-adapter"
import type {
  CategoryProductNamesResponse,
  CategoryProductsResponse,
  ProductContainer,
} from "@lib/furnisystems-sdk/modules/products/types"
import { ACTING_CUSTOMER_COOKIE } from "@lib/util/acting-customer-cookie"
import { isAgentOrAdmin } from "@lib/util/roles"
import { getActingCustomerId } from "./acting-customer"
import { getCatalogRequestContext } from "./catalog-transport"
import { getSessionCustomer } from "./session-customer"
import { getShowAllProductsCookie } from "./show-all-products"

/** Portal listing page size (v1 default too); quick search uses 4. */
export const CATALOG_PAGE_SIZE = 28
export const QUICK_SEARCH_PAGE_SIZE = 4
const MAX_PAGE = 10_000
const MAX_SEARCH_LENGTH = 100

/**
 * X-Acting-Customer-Id: the acting cookie, sent only when the backend's
 * current role of the session customer is agent/admin (the same condition
 * getActingCustomer uses on the GraphQL path; managers do not act until
 * 2c-9). getMe is only called when the cookie is set.
 */
async function actingCustomerIdForV1(): Promise<number | null> {
  const id = await getActingCustomerId()
  if (id == null || id <= 0) return null
  try {
    const me = await getSessionCustomer()
    return isAgentOrAdmin(me) ? id : null
  } catch {
    return null
  }
}

async function dropActingCookie(): Promise<void> {
  // Throws inside a server-component render (read-only cookies); the caller
  // (withActingRetry) ignores that, like getActingCustomer does.
  const store = await cookies()
  store.delete(ACTING_CUSTOMER_COOKIE)
}

/** One v1 catalogue GET with the session's bearer, acting id and showAll. */
async function catalogGet<T>(
  bearer: string | null,
  path: string,
  query: V1Query
): Promise<T> {
  const [actingId, showAll] = await Promise.all([
    bearer ? actingCustomerIdForV1() : Promise.resolve(null),
    getShowAllProductsCookie(),
  ])
  const restApiUrl = process.env.NEXT_PUBLIC_BACKEND_REST_API || ""
  return withActingRetry(
    actingId,
    (acting) =>
      v1DataGet<T>(
        { restApiUrl },
        {
          path,
          // showAll=1 only when the cookie is set; the server decides whether
          // the caller may use it (silently ignored otherwise).
          query: { ...query, showAll: showAll ? true : undefined },
          bearer,
          actingCustomerId: acting,
        }
      ),
    dropActingCookie
  )
}

/**
 * Runs the v1 call when this request's transport is v1, else (or after a
 * v1 401 while a legacy session exists) the GraphQL one.
 *   401           -> the "usable token" premise was false: GraphQL for this
 *                    call (the legacy `_furni_jwt` may still be valid; with
 *                    none, GraphQL is the guest catalogue, as before).
 *   anything else -> logged, and the same empty answer the GraphQL SDK
 *   (403/404/429/  methods return on failure, so the user sees what they
 *    5xx/network)   see today on a backend error (an empty listing).
 */
export async function runCatalogListing<T>(
  label: string,
  v1: (bearer: string | null) => Promise<T>,
  graphql: () => Promise<T>,
  empty: () => T
): Promise<T> {
  const ctx = await getCatalogRequestContext()
  if (ctx.transport === "graphql") return graphql()
  try {
    return await v1(ctx.bearer)
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401) {
      console.warn(`[catalog-v1] ${label}: 401, using the GraphQL path`)
      return graphql()
    }
    console.error(
      `[catalog-v1] ${label} failed:`,
      isV1ProblemError(error)
        ? `${error.status} ${error.code ?? ""} ${error.requestId ?? ""}`.trim()
        : error instanceof Error
        ? error.message
        : "unknown error"
    )
    return empty()
  }
}

const seg = (s: string) => encodeURIComponent(s)
const lang = (l: string) => (l || "en").toLowerCase()

/** 1-based page within the backend bounds; null = nothing to fetch. */
function pageParam(page: number): number | null {
  if (!Number.isFinite(page) || page < 1) return 1
  const p = Math.floor(page)
  return p > MAX_PAGE ? null : p
}

const emptyPage = (): CategoryProductsResponse => ({
  numberOfPages: 0,
  productsCount: 0,
  sortedProductContainers: [],
})

export async function v1CategoryProducts(
  bearer: string | null,
  p: {
    permalink: string
    language: string
    page: number
    sort: string
    attributeIds: number[]
    categoryIds: number[]
    newOnly: boolean
  }
): Promise<CategoryProductsResponse> {
  const page = pageParam(p.page)
  if (page === null) return emptyPage()
  const body = await catalogGet<V1ProductCardPage>(
    bearer,
    `/catalog/categories/${seg(p.permalink)}/products`,
    {
      language: lang(p.language),
      sort: p.sort,
      page,
      pageSize: CATALOG_PAGE_SIZE,
      attributeIds: p.attributeIds,
      categoryIds: p.categoryIds,
      new: p.newOnly,
    }
  )
  return mapV1ProductCardPage(body)
}

export async function v1CategoryProductNames(
  bearer: string | null,
  p: {
    permalink: string
    language: string
    attributeIds: number[]
    categoryIds: number[]
    newOnly: boolean
  }
): Promise<CategoryProductNamesResponse> {
  const body = await catalogGet<V1ProductNames>(
    bearer,
    `/catalog/categories/${seg(p.permalink)}/product-names`,
    {
      language: lang(p.language),
      attributeIds: p.attributeIds,
      categoryIds: p.categoryIds,
      new: p.newOnly,
    }
  )
  return mapV1ProductNames(body)
}

export async function v1CategoryFacets(
  bearer: string | null,
  p: {
    permalink: string
    language: string
    attributeIds: number[]
    categoryIds: number[]
    newOnly: boolean
  }
): Promise<PortalCategoryFacets> {
  const body = await catalogGet<V1CategoryFacets>(
    bearer,
    `/catalog/categories/${seg(p.permalink)}/facets`,
    {
      language: lang(p.language),
      attributeIds: p.attributeIds,
      categoryIds: p.categoryIds,
      new: p.newOnly,
    }
  )
  return mapV1CategoryFacets(body)
}

export async function v1CollectionProducts(
  bearer: string | null,
  p: { permalink: string; language: string; page: number }
): Promise<CategoryProductsResponse> {
  const page = pageParam(p.page)
  if (page === null) return emptyPage()
  const body = await catalogGet<V1ProductCardPage>(
    bearer,
    `/catalog/collections/${seg(p.permalink)}/products`,
    { language: lang(p.language), page, pageSize: CATALOG_PAGE_SIZE }
  )
  return mapV1ProductCardPage(body)
}

export async function v1SearchProducts(
  bearer: string | null,
  p: { q: string; language: string; page: number; pageSize: number }
): Promise<CategoryProductsResponse> {
  const page = pageParam(p.page)
  // v1 takes 1-100 chars; a longer term cannot be a substring of any name
  // the GraphQL path would realistically match either.
  if (page === null || !p.q || p.q.length > MAX_SEARCH_LENGTH) return emptyPage()
  const body = await catalogGet<V1ProductCardPage>(
    bearer,
    `/catalog/products/search`,
    { q: p.q, language: lang(p.language), page, pageSize: p.pageSize }
  )
  return mapV1ProductCardPage(body)
}

/** Products of a product_grid block; the server reads the block's config. */
export async function v1ContentBlockProducts(
  bearer: string | null,
  p: { blockId: number; language: string }
): Promise<ProductContainer[]> {
  const body = await catalogGet<V1ProductCardList>(
    bearer,
    `/catalog/content-blocks/${p.blockId}/products`,
    { language: lang(p.language) }
  )
  return mapV1ProductCards(body.data)
}
