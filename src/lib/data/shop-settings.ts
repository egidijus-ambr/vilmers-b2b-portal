import { sdk } from "@lib/config"
import { ShopSetting } from "@lib/furnisystems-sdk"
import { getCacheOptions } from "./cookies"

export const getShopSettings = async (
  language?: string
): Promise<ShopSetting | null> => {
  const next = {
    ...(await getCacheOptions("shop_settings")),
  }

  try {
    const shopSettings = await sdk.shopSettings.getShopSettings(language)
    return shopSettings
  } catch (error) {
    console.error("Error fetching shop settings:", error)
    return null
  }
}
