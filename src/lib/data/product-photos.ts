import { sdk } from "@lib/config"
import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"

/**
 * Fetch interior photos for a product by name
 * @param productName - The name of the product to fetch photos for
 * @returns Array of interior photos or empty array on error
 */
export async function getProductInteriorPhotos(
  productName: string
): Promise<ProductPhoto[]> {
  try {
    const response = await sdk.productPhotos.getProductPhotos(productName)

    // Filter to only return INTERIOR_PHOTOS
    return response.photos.filter(
      (photo: ProductPhoto) => photo.category === "INTERIOR_PHOTOS"
    )
  } catch (error) {
    console.error(`Failed to fetch interior photos for ${productName}:`, error)
    return []
  }
}
