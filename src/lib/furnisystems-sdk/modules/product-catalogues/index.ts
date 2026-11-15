import {
  ProductCataloguesResponse,
  BatchProductCataloguesResponse,
  MergeCataloguesRequest,
} from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"
import { v1BaseUrl, v1GetJson } from "../../client/catalog-v1"

// Mode-specific product caps enforced by the backend. Keep these in sync
// with MAX_PRODUCTS_PER_MERGE / MAX_PRODUCTS_PER_SPLIT in
// furnisystems-backend/src/services/catalog.service.ts — that file is the
// source of truth; a request over these caps is rejected there regardless of
// what the client sends.
export const MAX_PRODUCTS_PER_MERGE = 100
export const MAX_PRODUCTS_PER_SPLIT = 500

/** RFC 9457 problem+json body returned by /api/v1 on every non-2xx. */
export interface V1Problem {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  requestId?: string
  [key: string]: unknown
}

export class ProductCataloguesModule {
  private restApiUrl: string

  constructor(restApiUrl: string) {
    this.restApiUrl = restApiUrl
  }

  /**
   * Get the catalogues attached to one product container.
   */
  async getProductCatalogues(
    productContainerId: number
  ): Promise<ProductCataloguesResponse> {
    try {
      // The v1 response schema is strict and identical to the portal type.
      return await v1GetJson<ProductCataloguesResponse>(
        `${v1BaseUrl(this.restApiUrl)}/catalog/products/${encodeURIComponent(
          String(productContainerId)
        )}/catalogues`,
        "Failed to fetch product catalogues",
        // Catalogue attachments change rarely — avoid an uncached fetch on
        // every product page request.
        { next: { revalidate: 3600 } }
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
      // The v1 response schema is strict and identical to the portal type.
      return await v1GetJson<BatchProductCataloguesResponse>(
        `${v1BaseUrl(
          this.restApiUrl
        )}/catalog/catalogues?ids=${encodeURIComponent(query)}`,
        "Failed to fetch batch product catalogues"
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
   * Merge catalogues for multiple products: one PDF (`merge`) or a ZIP of the
   * individual PDFs (`split`). POST /api/v1/catalog/catalogues/merge, called
   * from the browser (anonymous; the app-level CORS allow-list applies).
   */
  async mergeCatalogues(params: MergeCataloguesRequest): Promise<Blob> {
    try {
      // The v1 body schema is strict: send exactly the declared keys.
      const body: MergeCataloguesRequest = {
        productIds: params.productIds,
        market: params.market,
        ...(params.mode !== undefined && { mode: params.mode }),
        ...(params.compressed !== undefined && {
          compressed: params.compressed,
        }),
      }
      const response = await fetch(
        `${v1BaseUrl(this.restApiUrl)}/catalog/catalogues/merge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/pdf, application/zip, application/problem+json",
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        // v1 answers every failure with problem+json. Its `detail` is a
        // human-readable message written by the backend (e.g. "No catalogues
        // found for the requested products and market", or the per-mode cap).
        // Keep the problem on `details` so callers can show `detail` instead
        // of a generic status line; fall back to NetworkError when the body
        // isn't JSON or carries no `detail` (e.g. a 500).
        let problem: V1Problem | undefined
        try {
          problem = (await response.json()) as V1Problem
        } catch {
          // Non-JSON error body — handled by the NetworkError fallback below.
        }
        if (
          problem &&
          typeof problem.detail === "string" &&
          problem.detail.length > 0
        ) {
          throw new FurnisystemsError(
            problem.detail,
            typeof problem.code === "string" ? problem.code : undefined,
            response.status,
            problem
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
