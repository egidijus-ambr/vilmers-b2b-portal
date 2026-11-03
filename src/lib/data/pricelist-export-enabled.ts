"use server"

import { getPricelistSettings } from "@lib/data/pricelist-settings"

/**
 * Server action for client components (account overview) that need the
 * admin switch ShopSetting.pricelist_export_enabled. Cached (60s) via
 * getPricelistSettings; false on any error. The API routes enforce the same
 * flag server-side independently.
 */
export async function getPricelistExportEnabled(): Promise<boolean> {
  return (await getPricelistSettings()).exportEnabled
}
