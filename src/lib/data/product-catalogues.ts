import { sdk } from "@lib/config"
import type { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"

/**
 * Catalogue PDFs attached to one product container (its ProductFile rows).
 * Keyed by container id: product names are not unique.
 */
export const getProductCatalogues = async (
  productContainerId: number
): Promise<CatalogueFile[]> => {
  try {
    const response =
      await sdk.productCatalogues.getProductCatalogues(productContainerId)
    return response.catalogues ?? []
  } catch (error) {
    console.error(
      `Error fetching product catalogues for product ${productContainerId}:`,
      error
    )
    return []
  }
}
