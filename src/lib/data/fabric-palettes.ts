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
    console.log("[palette-pdf-debug] getFabricPalettes sdk result", { total: palettes.length, firstItemKeys: palettes[0] ? Object.keys(palettes[0] as any) : [], firstItemId: (palettes[0] as any)?.id ?? null, firstItemCode: (palettes[0] as any)?.code ?? null, firstItemName: (palettes[0] as any)?.name ?? null })
    return palettes
  } catch (error) {
    console.error("[getFabricPalettes] Error:", error)
    return []
  }
}
