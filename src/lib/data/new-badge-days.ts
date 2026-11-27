import { newBadgeDaysOf } from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { getSharedShopSettings } from "./shop-settings"

/**
 * ShopSetting.new_badge_days (0 = "new" badge / filter disabled), from the
 * shared, caller-independent GET /catalog/shop-settings answer (cached 60 s,
 * tag "new-badge-days" still honoured; see ./shop-settings.ts). 0 on any
 * error, as before.
 */
export async function getNewBadgeDays(): Promise<number> {
  try {
    return newBadgeDaysOf(await getSharedShopSettings("en"))
  } catch (error) {
    console.error("Error fetching new badge days:", error)
    return 0
  }
}
