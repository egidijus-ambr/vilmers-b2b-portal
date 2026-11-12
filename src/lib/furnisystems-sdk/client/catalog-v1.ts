/**
 * Opt-in REST v1 transport for the anonymous catalog reads (product photos,
 * products summary, product catalogues).
 *
 * Switch: PORTAL_API_MODE_CATALOG=v1|legacy (default `legacy`).
 *  - Server runtime (RSC, route handlers): read from process.env at request
 *    time, so flipping the env + restarting is enough.
 *  - Browser: only NEXT_PUBLIC_PORTAL_API_MODE_CATALOG exists there and it is
 *    inlined at BUILD time. Set both to the same value to move server and
 *    browser calls together.
 * Base URL: the legacy REST base (NEXT_PUBLIC_BACKEND_REST_API, ends in /api)
 * + `/v1`, i.e. never a hardcoded host.
 */
import { NetworkError } from "./errors"

export type CatalogApiMode = "v1" | "legacy"

export function getCatalogApiMode(): CatalogApiMode {
  const raw =
    typeof window === "undefined"
      ? process.env.PORTAL_API_MODE_CATALOG
      : process.env.NEXT_PUBLIC_PORTAL_API_MODE_CATALOG
  return raw?.trim().toLowerCase() === "v1" ? "v1" : "legacy"
}

export function v1BaseUrl(restApiUrl: string): string {
  return `${restApiUrl.replace(/\/+$/, "")}/v1`
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
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
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

const nn = <T>(v: T | null | undefined): T | undefined => v ?? undefined

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
      // Optional in the legacy shape: absent rather than null.
      if (nn(p.combination) !== undefined) out.combination = p.combination
      if (nn(p.fabric) !== undefined) out.fabric = p.fabric
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
