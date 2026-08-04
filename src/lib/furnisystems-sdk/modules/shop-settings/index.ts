import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { ShopSetting, ShopSettingsResponse } from "./types"
import { normalizeLanguage } from "../../../i18n/config"

// Shared by NavigationItem, NavigationItemLink, and FooterLink — they all
// carry the same link-target scalars (see `linkTargetInputFields` on the
// backend) but are separate GraphQL object types with no common interface, so
// this is spliced into the query string rather than a `gql` fragment.
// `ancestors` mirrors the content-block `link_page` selection pattern, extended
// with the `ancestors` chain `buildLinkPageHref` needs for nested CMS pages.
const LINK_TARGET_FIELDS = `
  link_type
  link_page_id
  link_category_id
  link_collection_id
  external_url
  link_new_tab
  link_page {
    id
    parentId # required: backend 'ancestors' resolver reads root.parentId; without it ancestors returns [] and nested page links lose their parent path
    page_profiles {
      slug
      language
    }
    ancestors(language: $language) {
      page_profiles {
        slug
        language
      }
    }
  }
  link_category {
    category_profiles {
      language
      meta_information {
        permalink
      }
    }
  }
  link_collection {
    collection_profiles {
      language
      meta_information {
        permalink
      }
    }
  }
`

// `$language` is non-null: `link_page.ancestors` (via LINK_TARGET_FIELDS)
// requires a non-null `language` arg even though its resolver doesn't
// actually filter by it (root-first, all page_profiles) — see
// buildLinkPageHref, which does the language matching in code. Verified
// against the live schema: a nullable `$language` fails validation here.
export const APP_SHOP_SETTINGS = gql`
  query APP_SHOP_SETTINGS($language: Language!) {
    findFirstShopSetting {
      id
      currency

      favicon {
        id
        src
      }

      default_meta_image {
        id
        src
      }

      footer_logo_image {
        id
        src
      }

      footer_copyright_text
      footer_address
      footer_phone
      footer_email
      facebook
      twitter
      instagram
      pinterest
      linkedin

      default_manufacturer {
        company_name
        logo_image {
          id
          src
        }
      }

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
        gallery_images(orderBy: { display_order: asc }) {
          id
          src
          display_order
        }
        content_block_profiles {
          id
          name
          description
          description_format
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
          parentId # required: backend 'ancestors' resolver reads root.parentId; without it ancestors returns [] and nested page links lose their parent path
          page_profiles {
            slug
            language
          }
          ancestors(language: $language) {
            page_profiles {
              slug
              language
            }
          }
        }
        extra_css
        linked_items {
          id
          title
          link
          arrangement
          image {
            id
            src
          }
        }
        config
        product_containers {
          id
        }
      }

      navigation_items(orderBy: { arrangement: asc }) {
        id
        arrangement
        type
        panel_root_category_id
        panel_root_page_id
        featured_page_id
        navigation_item_profiles {
          language
          label
        }
        ${LINK_TARGET_FIELDS}
        links(orderBy: { arrangement: asc }) {
          id
          arrangement
          profiles {
            language
            label
          }
          ${LINK_TARGET_FIELDS}
        }
        panel_root_page {
          id
          published
          parentId
          page_profiles {
            language
            slug
            title
          }
          ancestors(language: $language) {
            page_profiles {
              slug
              language
            }
          }
          children(orderBy: [{ arrangement: asc }, { createdAt: asc }]) {
            id
            published
            page_profiles {
              language
              slug
              title
            }
            children(orderBy: [{ arrangement: asc }, { createdAt: asc }]) {
              id
              page_profiles {
                language
                slug
                title
              }
            }
          }
        }
        featured_page {
          id
          code
          published
          parentId
          page_profiles {
            language
            slug
            title
          }
          hero_image {
            id
            src
            src_md
            src_xs
          }
          tags {
            id
            slug
            page_tag_profiles {
              language
              name
            }
          }
          ancestors(language: $language) {
            page_profiles {
              slug
              language
            }
          }
        }
      }

      footer_columns(orderBy: { arrangement: asc }) {
        id
        arrangement
        footer_column_profiles {
          language
          heading
        }
        footer_links(orderBy: { arrangement: asc }) {
          id
          arrangement
          footer_link_profiles {
            language
            label
          }
          ${LINK_TARGET_FIELDS}
        }
      }
    }
  }
`

export class ShopSettingsModule {
  constructor(private client: GraphQLClient) {}

  async getShopSettings(language?: string): Promise<ShopSetting | null> {
    const lang = normalizeLanguage(language)
    try {
      const response = await this.client.query<ShopSettingsResponse>(
        APP_SHOP_SETTINGS,
        {
          variables: {
            language: lang,
          },
          // `no-cache` (matching every other call site in this SDK, e.g.
          // categories/collections): admin-edited nav/footer settings must be
          // visible immediately. The module-level `sdk` singleton's Apollo
          // client persists its InMemoryCache across requests, so
          // `cache-first` served stale data until process restart, and even
          // `network-only` would still *write* this response into that
          // shared cache on every request (it only skips *reading* from it).
          // `no-cache` neither reads nor writes it.
          fetchPolicy: "no-cache",
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
