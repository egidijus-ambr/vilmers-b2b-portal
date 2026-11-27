"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import { FabricPaletteDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { withActingRetry } from "@lib/furnisystems-sdk/client/v1-data"
import { mapV1Palettes } from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { getActingCustomer } from "./acting-customer"
import { runIdentityCall, v1ListPalettes } from "./me-v1"
import { actingCustomerIdForV1, dropActingCookie } from "./v1-acting"

/**
 * The fabric palettes of the customer in scope (the acting customer for an
 * agent / admin with a selected customer, else the caller's own).
 *
 *   v1 (2c-8): GET /me/palettes, with X-Acting-Customer-Id when acting
 *     (the backend checks the acting right and returns the palettes in the
 *     documented priority order, already de-duplicated). A stale / refused
 *     acting id (403 / 404) is retried once without it (the agent's own
 *     palettes, as the GraphQL path does with no acting customer).
 *   v1 errors (403 / 404 / 429 / 5xx): [] (the page shows its empty state).
 *   GraphQL: unchanged (legacy-only sessions; v1-transport-rule.ts).
 */
export const getFabricPalettes = async (): Promise<FabricPaletteDetail[]> => {
  unstable_noStore()

  try {
    const validation = await validateSession()

    if (!validation.isValid) {
      console.log(
        "[getFabricPalettes] Session validation failed:",
        validation.error
      )
      return []
    }

    return await runIdentityCall<FabricPaletteDetail[]>("getFabricPalettes", {
      v1: async (bearer) => {
        const acting = await actingCustomerIdForV1()
        const body = await withActingRetry(
          acting,
          (actingId) => v1ListPalettes(bearer, actingId),
          dropActingCookie
        )
        return mapV1Palettes(body)
      },
      graphql: () => getFabricPalettesGraphql(validation.customer),
      guest: () => [],
      onError: () => [],
    })
  } catch (error) {
    console.error("[getFabricPalettes] Error:", error)
    return []
  }
}

/** GraphQL path (legacy-only sessions; see v1-transport-rule.ts). */
async function getFabricPalettesGraphql(
  me: { id?: string | number } | null
): Promise<FabricPaletteDetail[]> {
  // When an agent has impersonated a customer, palettes must come from
  // the acting customer (and their group), not the agent's JWT identity.
  const acting = await getActingCustomer()
  const isImpersonating = acting && me && String(acting.id) !== String(me.id)

  if (isImpersonating) {
    return sdk.customer.getFabricPalettesForCustomer(Number(acting.id))
  }

  return sdk.customer.getFabricPalettes()
}
