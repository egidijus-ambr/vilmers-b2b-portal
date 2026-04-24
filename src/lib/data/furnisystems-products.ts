import { sdk } from "@lib/config"
import { FurnisystemsProductDetail } from "@lib/furnisystems-sdk/modules/products/types"

export const getProductByPermalink = async (
  permalink: string,
  language?: string,
  priceListIds?: number[]
): Promise<FurnisystemsProductDetail | null> => {
  try {
    return await sdk.products.getProductByPermalink(permalink, language, priceListIds)
  } catch (error) {
    console.error(`Error fetching product by permalink "${permalink}":`, error)
    return null
  }
}
