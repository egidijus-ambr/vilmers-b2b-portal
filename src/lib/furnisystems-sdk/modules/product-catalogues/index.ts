import {
  ProductCataloguesResponse,
  BatchProductCataloguesResponse,
  CatalogueCacheStatusResponse,
  CatalogueCachePopulateResponse,
  MergeCataloguesRequest,
} from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"

export class ProductCataloguesModule {
  private restApiUrl: string

  constructor(restApiUrl: string) {
    this.restApiUrl = restApiUrl
  }

  /**
   * Get catalogues for a specific product
   */
  async getProductCatalogues(
    productName: string,
    reference?: string | null
  ): Promise<ProductCataloguesResponse> {
    try {
      const refQuery =
        typeof reference === "string" && reference.length > 0
          ? `?reference=${encodeURIComponent(reference)}`
          : ""
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/${encodeURIComponent(
          productName
        )}${refQuery}`,
        {
          // Catalogue listings change rarely — avoid an uncached fetch on
          // every product page request.
          next: { revalidate: 3600 },
        }
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch product catalogues: ${response.status} ${response.statusText}`
        )
      }

      const data: ProductCataloguesResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch product catalogues for ${productName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Get catalogues for multiple products in a single request
   */
  async getBatchProductCatalogues(
    names: string[],
    references?: (string | null | undefined)[]
  ): Promise<BatchProductCataloguesResponse> {
    if (Array.isArray(references) && references.length !== names.length) {
      throw new FurnisystemsError(
        `getBatchProductCatalogues: references length (${references.length}) does not match names length (${names.length}). The two arrays must be positionally aligned.`
      )
    }
    try {
      const query = names.map((n) => encodeURIComponent(n)).join(",")
      // Preserve positional alignment with `names` so backend can pair entries
      const hasAnyReference =
        Array.isArray(references) &&
        references.some((r) => typeof r === "string" && r.length > 0)
      const referencesQuery = hasAnyReference
        ? `&references=${(references as (string | null | undefined)[])
            .map((r) =>
              typeof r === "string" && r.length > 0 ? encodeURIComponent(r) : ""
            )
            .join(",")}`
        : ""
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues?names=${query}${referencesQuery}`
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch batch product catalogues: ${response.status} ${response.statusText}`
        )
      }

      const data: BatchProductCataloguesResponse = await response.json()
      return data
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
   * Populate the catalogue cache
   */
  async populateCache(): Promise<CatalogueCachePopulateResponse> {
    try {
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/cache/populate`,
        { method: "POST" }
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to populate catalogue cache: ${response.status} ${response.statusText}`
        )
      }

      const data: CatalogueCachePopulateResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to populate catalogue cache: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Get the current cache status
   */
  async getCacheStatus(): Promise<CatalogueCacheStatusResponse> {
    try {
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/cache/status`
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch catalogue cache status: ${response.status} ${response.statusText}`
        )
      }

      const data: CatalogueCacheStatusResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch catalogue cache status: ${
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
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/merge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      )

      if (!response.ok) {
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

  /**
   * Clear the catalogue cache
   */
  async clearCache(): Promise<void> {
    try {
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/cache/clear`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to clear catalogue cache: ${response.status} ${response.statusText}`
        )
      }
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to clear catalogue cache: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }
}

// Export types
export * from "./types"
