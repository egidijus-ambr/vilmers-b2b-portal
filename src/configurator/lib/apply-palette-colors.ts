import { resolvePaletteFabrics } from "../../lib/fabric-palettes/palette-colors"

/**
 * Applies the customer's palette colour selections / override names to the
 * manufacturer fabric groups returned by the configurator query. Groups left
 * with no colours are dropped. Returns new objects (no mutation).
 */
export function applyPaletteColors<T extends Record<string, any>>(
  productContainer: T | null,
  paletteIds: number[]
): T | null {
  const priceCategories = productContainer?.manufacturer?.fabric_price_category
  if (!productContainer || !Array.isArray(priceCategories)) return productContainer

  return {
    ...productContainer,
    manufacturer: {
      ...productContainer.manufacturer,
      fabric_price_category: priceCategories.map((cat: any) => ({
        ...cat,
        fabric_groups: (cat.fabric_groups ?? [])
          .map((g: any) => {
            const rows = paletteIds
              .map((id) =>
                (g.fabric_palettes ?? []).find(
                  (fp: any) => Number(fp?.fabric_palette?.id) === id
                )
              )
              .filter(Boolean)
            return { ...g, fabrics: resolvePaletteFabrics(g.fabrics ?? [], rows) }
          })
          .filter((g: any) => g.fabrics.length > 0),
      })),
    },
  }
}
