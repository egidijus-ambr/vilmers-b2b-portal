import {
  ProductCataloguesResponse,
  BatchProductCataloguesResponse,
  MergeCataloguesRequest,
} from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"
import {
  mapV1BatchCatalogues,
  mapV1ProductCatalogues,
  v1BaseUrl,
  v1GetJson,
} from "../../client/catalog-v1"

// Mode-specific product caps enforced by the backend. Keep these in sync
// with MAX_PRODUCTS_PER_MERGE / MAX_PRODUCTS_PER_SPLIT in
// furnisystems-backend/src/rest-api/routes/productFileCatalogues.ts — that file is
// the source of truth; a request over these caps is rejected there
// regardless of what the client sends.
export const MAX_PRODUCTS_PER_MERGE = 100
export const MAX_PRODUCTS_PER_SPLIT = 500

export class ProductCataloguesModule {
  /** Base URL of the backend catalogue routes (ProductFile-backed). */
  private cataloguesUrl: string
  private restApiUrl: string

  constructor(restApiUrl: string) {
    this.restApiUrl = restApiUrl
    this.cataloguesUrl = `${restApiUrl}/product-files/catalogues`
  }

  /**
   * Get the catalogues attached to one product container.
   */
  async getProductCatalogues(
    productContainerId: number
  ): Promise<ProductCataloguesResponse> {
    try {
      return mapV1ProductCatalogues(
        await v1GetJson(
          `${v1BaseUrl(this.restApiUrl)}/catalog/products/${encodeURIComponent(
            String(productContainerId)
          )}/catalogues`,
          "Failed to fetch product catalogues",
          // Catalogue attachments change rarely — avoid an uncached fetch on
          // every product page request.
          { next: { revalidate: 3600 } }
        )
      )
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch product catalogues for product ${productContainerId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Get catalogues for several product containers in a single request
   * (backend caps this at MAX_PRODUCTS_PER_LISTING = 500 ids).
   */
  async getBatchProductCatalogues(
    productContainerIds: number[]
  ): Promise<BatchProductCataloguesResponse> {
    try {
      const query = productContainerIds.map((id) => String(id)).join(",")
      return mapV1BatchCatalogues(
        await v1GetJson(
          `${v1BaseUrl(this.restApiUrl)}/catalog/catalogues?ids=${encodeURIComponent(
            query
          )}`,
          "Failed to fetch batch product catalogues"
        )
      )
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch batch product catalogues: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Merge catalogues for multiple products into a single PDF
   */
  async mergeCatalogues(params: MergeCataloguesRequest): Promise<Blob> {
    try {
      const response = await fetch(`${this.cataloguesUrl}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        // The backend returns a JSON body with a human-readable `error`
        // string for deliberate failures (e.g. over the per-mode product
        // cap — see MAX_PRODUCTS_PER_MERGE/SPLIT above). Preserve it on
        // `details` so callers can show it instead of a generic status
        // line; fall back to NetworkError when the body isn't JSON or
        // doesn't carry an `error` string.
        let data: { error?: string; [key: string]: unknown } | undefined
        try {
          data = await response.json()
        } catch {
          // Non-JSON error body — handled by the NetworkError fallback below.
        }
        if (data && typeof data.error === "string" && data.error.length > 0) {
          throw new FurnisystemsError(
            data.error,
            undefined,
            response.status,
            data
          )
        }
        throw new NetworkError(
          `Failed to merge catalogues: ${response.status} ${response.statusText}`
        )
      }

      return response.blob()
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to merge catalogues: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }
}

// Export types
export * from "./types"
