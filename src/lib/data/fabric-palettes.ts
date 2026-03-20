"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import { FabricPaletteDetail } from "@lib/furnisystems-sdk/modules/customer/types"

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

    const palettes = await sdk.customer.getFabricPalettes()
    return palettes
  } catch (error) {
    console.error("[getFabricPalettes] Error:", error)
    return []
  }
}
