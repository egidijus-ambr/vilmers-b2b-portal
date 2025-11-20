import { ProductsSummaryResponse, ProductPhotosResponse } from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"

export class ProductPhotosModule {
  private restApiUrl: string

  constructor(restApiUrl: string) {
    this.restApiUrl = restApiUrl
  }

  /**
   * Get a summary of all products with photo counts
   */
  async getProductsSummary(): Promise<ProductsSummaryResponse> {
    try {
      const response = await fetch(`${this.restApiUrl}/s3/products-summary`)

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch products summary: ${response.status} ${response.statusText}`
        )
      }

      const data: ProductsSummaryResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch products summary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Get photos for a specific product
   */
  async getProductPhotos(productName: string): Promise<ProductPhotosResponse> {
    try {
      const response = await fetch(
        `${this.restApiUrl}/s3/product-photos/${encodeURIComponent(
          productName
        )}`
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch product photos: ${response.status} ${response.statusText}`
        )
      }

      const data: ProductPhotosResponse = await response.json()
      return data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch product photos for ${productName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }
}

// Export types
export * from "./types"
