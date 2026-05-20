import {
  MaterialAvailabilityRequest,
  MaterialAvailabilityRawResponse,
  MaterialAvailabilityResult,
} from "./types"
import { FurnisystemsError, NetworkError } from "../../client/errors"

export class MaterialAvailabilityModule {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  /**
   * Fetch material/fabric availability from the Vilmers AX proxy.
   */
  async getAvailability(
    req: MaterialAvailabilityRequest
  ): Promise<MaterialAvailabilityResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/available_materials_prod.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ contract: req }),
        }
      )

      if (!response.ok) {
        throw new NetworkError(
          `Failed to fetch material availability: ${response.status} ${response.statusText}`
        )
      }

      const data = (await response.json()) as MaterialAvailabilityRawResponse

      if (data.status !== "Completed") {
        throw new FurnisystemsError(data.errorMessage || "Stock unavailable")
      }

      return { totalQty: data.totalQty }
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Failed to fetch material availability: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }
}

// Export types
export * from "./types"
