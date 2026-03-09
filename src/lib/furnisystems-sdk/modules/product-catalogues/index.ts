import {
  ProductCataloguesResponse,
  BatchProductCataloguesResponse,
  CatalogueCacheStatusResponse,
  CatalogueCachePopulateResponse,
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
    productName: string
  ): Promise<ProductCataloguesResponse> {
    try {
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues/${encodeURIComponent(
          productName
        )}`
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
    names: string[]
  ): Promise<BatchProductCataloguesResponse> {
    try {
      const query = names.map((n) => encodeURIComponent(n)).join(",")
      const response = await fetch(
        `${this.restApiUrl}/s3/product-catalogues?names=${query}`
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
