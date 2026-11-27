import "server-only"

import { unstable_cache } from "next/cache"
import { sdk } from "@lib/config"
import { ShopSetting } from "@lib/furnisystems-sdk"
import {
  mapV1ShopSettings,
  type V1PublicShopSettings,
} from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { normalizeLanguage } from "@lib/i18n/config"
import { CMS_FLUSH_TAG, runCmsCall, v1Lang, v1SessionGet, v1SharedGet } from "./cms-v1"

/**
 * Shop settings on REST v1 (slice 5): ONE GET /catalog/shop-settings?language
 * replaces the findFirstShopSetting documents (site settings, new-badge
 * days, pricelist settings) and the fabric_low_stock_threshold Setting read.
 *
 * Two reads:
 *   getSharedShopSettings  the GUEST answer (no bearer / acting / BFF
 *     headers), identical for every caller, so unstable_cache'd for 60 s
 *     (the TTL the dedicated settings reads had) and busted by the old tags
 *     and the backend's B2B flush tag. It is also the source of the
 *     caller-independent values (./new-badge-days.ts,
 *     ./pricelist-settings.ts, ./fabric-callout-settings.ts). A failure
 *     throws inside the cache (never cached).
 *   getShopSettings  what the layouts render (navigation, footer, homepage
 *     blocks): a guest gets the shared answer; a v1 session reads with its
 *     bearer, uncached (private CMS pages linked from the nav / footer /
 *     homepage blocks are only in a portal session's answer, as with the
 *     token-authenticated GraphQL call before); legacy-only sessions and a
 *     v1 401 keep the GraphQL call. Any other failure -> null, as before.
 */
const SHOP_SETTINGS_TTL_SECONDS = 60

export const getSharedShopSettings = unstable_cache(
  async (language: string): Promise<V1PublicShopSettings> =>
    v1SharedGet<V1PublicShopSettings>("/catalog/shop-settings", { language }),
  ["v1-shop-settings"],
  {
    revalidate: SHOP_SETTINGS_TTL_SECONDS,
    tags: ["shop-settings", "new-badge-days", "pricelist-settings", CMS_FLUSH_TAG],
  }
)

export const getShopSettings = async (
  language?: string
): Promise<ShopSetting | null> => {
  const lang = v1Lang(normalizeLanguage(language))
  return runCmsCall<ShopSetting | null>("shop settings", {
    v1: async (bearer) =>
      mapV1ShopSettings(
        bearer
          ? await v1SessionGet<V1PublicShopSettings>(bearer, "/catalog/shop-settings", {
              language: lang,
            })
          : await getSharedShopSettings(lang)
      ),
    graphql: () => getShopSettingsGraphql(language),
    onError: () => null,
  })
}

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getShopSettingsGraphql(language?: string): Promise<ShopSetting | null> {
  try {
    return await sdk.shopSettings.getShopSettings(language)
  } catch (error) {
    console.error("Error fetching shop settings:", error)
    return null
  }
}
