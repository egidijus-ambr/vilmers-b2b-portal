import { sdk } from "@lib/config"
import type { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"

export const getProductCatalogues = async (
  productName: string,
  reference?: string | null
): Promise<CatalogueFile[]> => {
  try {
    const response = await sdk.productCatalogues.getProductCatalogues(
      productName,
      reference
    )
    return response.catalogues ?? []
  } catch (error) {
    console.error(`Error fetching product catalogues for "${productName}":`, error)
    return []
  }
}
