import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { ShopSetting, ShopSettingsResponse } from "./types"

export const APP_SHOP_SETTINGS = gql`
  query APP_SHOP_SETTINGS($language: Language) {
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

      homepage_content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
        id
        type
        style
        video_link
        video_type
        video_autoplay
        video_loop
        arrangement
        main_image {
          id
          src
        }
        gallery_images {
          id
          src
        }
        content_block_profiles {
          id
          name
          description
          link
          language
        }
        default_margins
        max_height
        max_width
        min_height
        min_width
        top_margin
        bottom_margin
        left_margin
        right_margin
        background_color
        text_color
        media_max_height
        media_max_width
        media_min_height
        media_min_width
        object_fit_cover
        link_new_tab
        link_page {
          id
          page_profiles {
            slug
            language
          }
        }
        extra_css
      }
    }
  }
`

export class ShopSettingsModule {
  constructor(private client: GraphQLClient) {}

  async getShopSettings(language?: string): Promise<ShopSetting | null> {
    try {
      const response = await this.client.query<ShopSettingsResponse>(
        APP_SHOP_SETTINGS,
        {
          variables: {
            ...(language ? { language: language.toLowerCase() } : {}),
          },
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
