/**
 * REST v1 transport for the anonymous catalog reads (product photos, products
 * summary, product catalogues). Base URL: the REST base
 * (NEXT_PUBLIC_BACKEND_REST_API, ends in /api) + `/v1`; no hardcoded host.
 */
import { NetworkError } from "./errors"
import { getBffHeadersIfAvailable } from "./index"

export function v1BaseUrl(restApiUrl: string): string {
  return `${restApiUrl.replace(/\/+$/, "")}/v1`
}

/**
 * URL for the v1 product-photos endpoint, for call sites that
 * fetch directly (PDP galleries). `categoryCodes` is the comma-joined list;
 * present-but-empty matches nothing on both endpoints (strict scope).
 */
export function productPhotosUrl(
  restApiUrl: string,
  productName: string,
  categoryCodes: string
): string {
  const path = `${v1BaseUrl(restApiUrl)}/catalog/products/${encodeURIComponent(
    productName
  )}/photos`
  return `${path}?categoryCodes=${encodeURIComponent(categoryCodes)}`
}

/**
 * GET a v1 JSON endpoint. Non-2xx responses (RFC 9457 problem+json) become a
 * NetworkError with the same `<what>: <status> <statusText>` message shape the
 * legacy calls produce, so callers see identical failures.
 */
export async function v1GetJson<T>(
  url: string,
  failureLabel: string,
  init?: RequestInit
): Promise<T> {
  // Server-side only: forward the trusted-BFF headers so the v1 per-IP limiter
  // (600/min) keys on the end user's IP, not this server's. Skipped for
  // revalidate-cached fetches: Next keys its data cache on request headers, so
  // a per-user x-client-ip would fragment the cache; those calls are rare
  // enough to share the server IP's budget. Never sent from the browser.
  const bff = (init as { next?: { revalidate?: number } } | undefined)?.next
    ?.revalidate
    ? {}
    : await getBffHeadersIfAvailable()
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...bff, ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    throw new NetworkError(
      `${failureLabel}: ${response.status} ${response.statusText}`
    )
  }
  return (await response.json()) as T
}

// ---- v1 -> legacy shape mappers (the callers' types are the contract) ----

import type {
  ProductPhotosResponse,
  ProductsSummaryResponse,
} from "../modules/product-photos/types"
import type {
  BatchProductCataloguesResponse,
  ProductCataloguesResponse,
} from "../modules/product-catalogues/types"


export function mapV1ProductsSummary(
  v1: { products: Array<Record<string, any>>; timestamp: string }
): ProductsSummaryResponse {
  // Legacy returns the same service result ({products, timestamp}); the typed
  // `summary` block is not sent by either endpoint, so it is not invented here.
  return {
    products: v1.products.map((p) => ({
      name: p.name,
      main_product_category: p.main_product_category,
      secondary_category: p.secondary_category,
      first_interior_photo_url: p.first_interior_photo_url,
      newest_photo_at: p.newest_photo_at,
    })),
    timestamp: v1.timestamp,
  } as ProductsSummaryResponse
}

export function mapV1ProductPhotos(
  v1: {
    productName: string
    photos: Array<Record<string, any>>
    count?: number
    fromCache?: boolean
  }
): ProductPhotosResponse {
  // categoryCode / count / fromCache are not in the typed shape but the legacy
  // endpoint sends them too, so they are kept for exact parity.
  return {
    productName: v1.productName,
    count: v1.count,
    fromCache: v1.fromCache,
    photos: v1.photos.map((p) => {
      const out: Record<string, unknown> = {
        url: p.url,
        name: p.name,
        variant: p.variant,
        category: p.category,
        categoryCode: p.categoryCode,
        mediaType: p.mediaType,
        created_at: p.created_at,
      }
      // Legacy (photoFromKey) keeps explicit null; only omit when undefined.
      if (p.combination !== undefined) out.combination = p.combination
      if (p.fabric !== undefined) out.fabric = p.fabric
      return out
    }),
  } as unknown as ProductPhotosResponse
}

export function mapV1ProductCatalogues(
  v1: ProductCataloguesResponse
): ProductCataloguesResponse {
  return {
    productContainerId: v1.productContainerId,
    catalogues: v1.catalogues.map((c) => ({
      url: c.url,
      filename: c.filename,
      market: c.market,
      category: c.category,
    })),
    count: v1.count,
  }
}

export function mapV1BatchCatalogues(
  v1: BatchProductCataloguesResponse
): BatchProductCataloguesResponse {
  const products: BatchProductCataloguesResponse["products"] = {}
  for (const [id, entry] of Object.entries(v1.products)) {
    products[id] = {
      catalogues: entry.catalogues.map((c) => ({
        url: c.url,
        filename: c.filename,
        market: c.market,
        category: c.category,
      })),
      count: entry.count,
    }
  }
  return { products, totalCount: v1.totalCount }
}
