import { unstable_cache } from "next/cache"
import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

// Dedicated tiny query (deliberately NOT part of APP_SHOP_SETTINGS), same
// pattern as new-badge-days.ts: if the backend does not expose these fields
// yet, the failing query only costs us the pricelist export (it stays OFF),
// never the shop settings.
const GET_PRICELIST_SETTINGS = gql`
  query GET_PRICELIST_SETTINGS {
    findFirstShopSetting {
      id
      pricelist_export_enabled
      pricelist_cover_enabled
      pricelist_cover_terms
      pricelist_cover_component_group_ids
      pricelist_cover_image {
        id
        src
      }
      default_manufacturer {
        id
        logo_image {
          id
          src
        }
      }
    }
  }
`

export interface PricelistSettings {
  /** Admin switch (ShopSetting.pricelist_export_enabled). Default false. */
  exportEnabled: boolean
  coverEnabled: boolean
  coverImageUrl: string | null
  coverTerms: string
  /** Ordered AdditionalComponentGroup ids whose customer values print on the cover. */
  coverComponentGroupIds: number[]
  /** Brand logo (default manufacturer); falls back to the local logo.svg. */
  logoUrl: string
}

/** Same fallback the nav uses. */
export const FALLBACK_LOGO_URL = "/images/logo.svg"

export const PRICELIST_SETTINGS_DEFAULT: PricelistSettings = {
  exportEnabled: false,
  coverEnabled: false,
  coverImageUrl: null,
  coverTerms: "",
  coverComponentGroupIds: [],
  logoUrl: FALLBACK_LOGO_URL,
}

const PRICELIST_SETTINGS_TTL_SECONDS = 60

async function fetchPricelistSettings(): Promise<PricelistSettings> {
  try {
    const apolloClient = sdk.getApolloClient()
    const { data } = await apolloClient.query<{
      findFirstShopSetting: {
        pricelist_export_enabled?: boolean | null
        pricelist_cover_enabled?: boolean | null
        pricelist_cover_terms?: string | null
        pricelist_cover_component_group_ids?: number[] | null
        pricelist_cover_image?: { src?: string | null } | null
        default_manufacturer?: {
          logo_image?: { src?: string | null } | null
        } | null
      } | null
    }>({
      query: GET_PRICELIST_SETTINGS,
      fetchPolicy: "no-cache", // unstable_cache handles caching
    })
    const s = data.findFirstShopSetting
    return {
      exportEnabled: s?.pricelist_export_enabled === true,
      coverEnabled: s?.pricelist_cover_enabled === true,
      coverImageUrl: s?.pricelist_cover_image?.src?.trim() || null,
      coverTerms: (s?.pricelist_cover_terms ?? "").trim(),
      coverComponentGroupIds: s?.pricelist_cover_component_group_ids ?? [],
      logoUrl:
        s?.default_manufacturer?.logo_image?.src?.trim() || FALLBACK_LOGO_URL,
    }
  } catch (error) {
    console.error("Error fetching pricelist settings:", error)
    return PRICELIST_SETTINGS_DEFAULT
  }
}

export const getPricelistSettings = unstable_cache(
  fetchPricelistSettings,
  ["pricelist-settings"],
  { revalidate: PRICELIST_SETTINGS_TTL_SECONDS, tags: ["pricelist-settings"] }
)
