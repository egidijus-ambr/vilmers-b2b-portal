import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { ShopSetting, ShopSettingsResponse } from "./types"

export const APP_SHOP_SETTINGS = gql`
  query APP_SHOP_SETTINGS {
    findFirstShopSetting {
      id
      currency

      enabled_languages {
        id
        language
        web_address_enabled
        default_language
        web_address
        shop_phone_number
        google_analytics
        google_tag_manager
        facebook_pixel
        facebook_page_id
        hotjar
        enable_language_switcher
        price_multiplier
      }
    }
  }
`

export class ShopSettingsModule {
  constructor(private client: GraphQLClient) {}

  async getShopSettings(): Promise<ShopSetting | null> {
    try {
      const response = await this.client.query<ShopSettingsResponse>(
        APP_SHOP_SETTINGS,
        {
          fetchPolicy: "cache-first", // Use cache for shop settings as they don't change often
          errorPolicy: "all", // Return partial data even if there are errors
        }
      )

      const shopSettings = response.findFirstShopSetting

      if (!shopSettings) {
        return null
      }

      return shopSettings
    } catch (error) {
      console.error("Error fetching shop settings:", error)
      return null
    }
  }
}

export * from "./types"
