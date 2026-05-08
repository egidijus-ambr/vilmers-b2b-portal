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
      const direct =
        acting.fabric_palettes?.map((p: { id: string | number }) =>
          Number(p.id)
        ) ?? []
      const group =
        acting.customer_group?.fabric_palettes?.map(
          (p: { id: string | number }) => Number(p.id)
        ) ?? []
      const ids = Array.from(new Set<number>([...direct, ...group])).filter(
        (n) => Number.isFinite(n)
      )
      const palettes = await sdk.customer.getFabricPalettesByIds(ids)
      console.log("[palette-pdf-debug] getFabricPalettes acting-customer result", { actingId: acting.id, ids, total: palettes.length })
      return palettes
    }

    const palettes = await sdk.customer.getFabricPalettes()
    console.log("[palette-pdf-debug] getFabricPalettes sdk result", { total: palettes.length, firstItemKeys: palettes[0] ? Object.keys(palettes[0] as any) : [], firstItemId: (palettes[0] as any)?.id ?? null, firstItemCode: (palettes[0] as any)?.code ?? null, firstItemName: (palettes[0] as any)?.name ?? null })
    return palettes
  } catch (error) {
    console.error("[getFabricPalettes] Error:", error)
    return []
  }
}
