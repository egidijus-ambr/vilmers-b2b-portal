"use server"

import { lowStockThresholdOf } from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { getSharedShopSettings } from "./shop-settings"

export type FabricCalloutSettings = {
  threshold: number
}

const DEFAULT_THRESHOLD = 50

/**
 * Setting `fabric_low_stock_threshold`, now part of the shared,
 * caller-independent GET /catalog/shop-settings answer
 * (`fabric_low_stock_threshold`, the backend applies the same default of
 * 50; cached 60 s, see ./shop-settings.ts). 50 on any error, as before.
 */
export async function getFabricCalloutSettings(): Promise<FabricCalloutSettings> {
  try {
    return { threshold: lowStockThresholdOf(await getSharedShopSettings("en")) }
  } catch (error) {
    console.error("[getFabricCalloutSettings] Error:", error)
    return { threshold: DEFAULT_THRESHOLD }
  }
}
