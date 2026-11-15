"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import { FabricPaletteDetail } from "@lib/furnisystems-sdk/modules/customer/types"
import { getActingCustomer } from "./acting-customer"

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

    // When an agent has impersonated a customer, palettes must come from
    // the acting customer (and their group), not the agent's JWT identity.
    const acting = await getActingCustomer()
    const me = validation.customer
    const isImpersonating =
      acting && me && String(acting.id) !== String(me.id)

    if (isImpersonating) {
      const palettes = await sdk.customer.getFabricPalettesForCustomer(
        Number(acting.id)
      )
      return palettes
    }

    const palettes = await sdk.customer.getFabricPalettes()
    return palettes
  } catch (error) {
    console.error("[getFabricPalettes] Error:", error)
    return []
  }
}
