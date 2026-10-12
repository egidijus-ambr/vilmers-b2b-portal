/**
 * Palette priority order. MUST match the backend helper `orderPaletteIds` in
 * furnisystems-backend/src/utilities/paletteColorResolution.ts, otherwise the
 * names the UI shows differ from the names the server snapshots on the cart.
 *
 * Direct palettes first (id ASC), then customer-group palettes (id ASC),
 * de-duplicated by id (first occurrence wins).
 */
export function orderPalettes<T extends { id: string | number }>(
  direct: T[] | null | undefined,
  group: T[] | null | undefined
): T[] {
  const asc = (a: T, b: T) => Number(a.id) - Number(b.id)
  const seen = new Set<number>()
  const out: T[] = []
  for (const p of [...(direct ?? [])].sort(asc).concat([...(group ?? [])].sort(asc))) {
    const id = Number(p.id)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(p)
  }
  return out
}

export function orderPaletteIds(
  direct: { id: string | number }[] | null | undefined,
  group: { id: string | number }[] | null | undefined
): number[] {
  return orderPalettes(direct, group).map((p) => Number(p.id))
}
