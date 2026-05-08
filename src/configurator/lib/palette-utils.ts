import { useMemo } from "react"
import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import type { FabricGroupWithPrice } from "./types"

/**
 * Resolve customer palette IDs from customer + customer group, deduplicated.
 */
export function useCustomerPaletteIds(): number[] {
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  // Agents impersonating a customer must read palettes from the acting
  // customer, not their own JWT identity.
  const source = (actingCustomer ?? customer) as
    | {
        fabric_palettes?: { id: string | number }[]
        customer_group?: { fabric_palettes?: { id: string | number }[] }
      }
    | null
  return useMemo(() => {
    const direct = source?.fabric_palettes?.map((p) => Number(p.id)) ?? []
    const group = source?.customer_group?.fabric_palettes?.map((p) => Number(p.id)) ?? []
    return Array.from(new Set([...direct, ...group]))
  }, [source?.fabric_palettes, source?.customer_group?.fabric_palettes])
}

/**
 * Get display name for a fabric group, with palette name override support.
 * Priority: first matching palette with non-null name > language profile > code > fallback.
 */
export function getGroupName(
  group: FabricGroupWithPrice,
  languageCode: string,
  customerPaletteIds?: number[]
): string {
  if (customerPaletteIds?.length && group.fabric_palettes?.length) {
    for (const paletteId of customerPaletteIds) {
      const match = group.fabric_palettes.find(
        (fp) => fp.fabric_palette.id === paletteId && fp.name
      )
      if (match) return match.name!
    }
  }

  const profile =
    group.fabric_group_profiles?.find((p) => p.language === languageCode) ??
    group.fabric_group_profiles?.[0]
  return profile?.name ?? group.code ?? `Group ${group.id}`
}
