import { useMemo } from "react"
import { useCustomer } from "@lib/context/customer-context"
import type { FabricGroupWithPrice } from "./types"

/**
 * Resolve customer palette IDs from customer + customer group, deduplicated.
 */
export function useCustomerPaletteIds(): number[] {
  const { customer } = useCustomer()
  return useMemo(() => {
    const direct = customer?.fabric_palettes?.map((p) => Number(p.id)) ?? []
    const group = customer?.customer_group?.fabric_palettes?.map((p) => Number(p.id)) ?? []
    return Array.from(new Set([...direct, ...group]))
  }, [customer?.fabric_palettes, customer?.customer_group?.fabric_palettes])
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
