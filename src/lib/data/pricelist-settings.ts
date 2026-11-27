import { pricelistSettingsOf } from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { getSharedShopSettings } from "./shop-settings"

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

/**
 * The pricelist export switches, cover settings and brand logo, from the
 * shared, caller-independent GET /catalog/shop-settings answer (cached 60 s,
 * tag "pricelist-settings" still honoured; see ./shop-settings.ts). Safe in
 * route handlers and export jobs (no session read). Defaults on any error,
 * as before.
 */
export async function getPricelistSettings(): Promise<PricelistSettings> {
  try {
    return pricelistSettingsOf(await getSharedShopSettings("en"), FALLBACK_LOGO_URL)
  } catch (error) {
    console.error("Error fetching pricelist settings:", error)
    return PRICELIST_SETTINGS_DEFAULT
  }
}
