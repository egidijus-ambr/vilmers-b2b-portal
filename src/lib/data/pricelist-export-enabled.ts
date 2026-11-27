"use server"

import { getPricelistSettings } from "@lib/data/pricelist-settings"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { describeV1Error, v1GetAuthSession } from "./me-v1"
import { getV1RequestContext } from "./v1-transport"

/**
 * Server action for client components (account overview) that need to know
 * whether to show the pricelist export: the admin switch
 * ShopSetting.pricelist_export_enabled (cached 60s via getPricelistSettings;
 * false on any error) AND, on a v1 session, a login with prices
 * (GET /auth/session `features.prices` is not false). GET
 * /me/pricelist-export answers 403 to a login without prices, so the card is
 * hidden for it instead of offering a button that cannot work. The flag is
 * the CALLER's login (as the backend's 403), not the acting customer's.
 *
 * Legacy GraphQL sessions: the switch only, as before (GraphQL serves the
 * rows). A failed /auth/session read keeps the card (the export route then
 * answers its own error). The API routes enforce everything server-side
 * independently.
 */
export async function getPricelistExportEnabled(): Promise<boolean> {
  if (!(await getPricelistSettings()).exportEnabled) return false
  try {
    const ctx = await getV1RequestContext()
    if (ctx.identity !== "v1" || !ctx.bearer) return true
    const session = await v1GetAuthSession(ctx.bearer)
    return session.features?.prices !== false
  } catch (error) {
    if (!(isV1ProblemError(error) && error.status === 401)) {
      console.error(
        "[pricelist-export] auth/session failed:",
        describeV1Error(error)
      )
    }
    return true
  }
}
