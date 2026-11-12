import { ProductsSummaryResponse, ProductPhotosResponse } from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"
import {
  mapV1ProductPhotos,
  mapV1ProductsSummary,
  v1BaseUrl,
  v1GetJson,
} from "../../client/catalog-v1"

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
      return mapV1ProductsSummary(
        await v1GetJson(
          `${v1BaseUrl(this.restApiUrl)}/catalog/products/summary`,
          "Failed to fetch products summary"
        )
      )
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
      return mapV1ProductPhotos(
        await v1GetJson(
          `${v1BaseUrl(this.restApiUrl)}/catalog/products/${encodeURIComponent(
            productName
          )}/photos`,
          "Failed to fetch product photos"
        )
      )
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
