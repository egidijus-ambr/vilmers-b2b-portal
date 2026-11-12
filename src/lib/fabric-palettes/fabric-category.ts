// Pure helpers for the per-colour price category (palette `category` override).
// `price_group_number` on a fabric is set by `resolvePaletteFabrics` ONLY when a
// palette override resolved; otherwise the fabric group's default applies.
// No React, relative imports only (runnable via sucrase-node).

export type CategoryFabric = {
  code: string
  color_name?: string | null
  price_group_number?: number | null
}

/** Effective price category of one colour: palette override, else group default. */
export function getFabricGroupNumber(
  fabric: { price_group_number?: number | null } | null | undefined,
  defaultNumber: number | null | undefined
): number | null {
  return fabric?.price_group_number ?? defaultNumber ?? null
}

/** Colour order used by the fabric drawer (name, falling back to code). */
export function compareFabricsForDisplay(
  a: { code: string; color_name?: string | null },
  b: { code: string; color_name?: string | null }
): number {
  return (a.color_name ?? a.code).localeCompare(b.color_name ?? b.code)
}

/**
 * Category shown for a fabric group (drawer header, account palettes page):
 * the effective category of the FIRST colour in drawer order. When every colour
 * shares one category that is simply that category. Falls back to the group
 * default when there are no colours.
 */
export function getGroupDisplayCategory(
  fabrics: CategoryFabric[] | null | undefined,
  defaultNumber: number | null | undefined
): number | null {
  if (!fabrics || fabrics.length === 0) return defaultNumber ?? null
  const first = [...fabrics].sort(compareFabricsForDisplay)[0]
  return getFabricGroupNumber(first, defaultNumber)
}

/** Every distinct effective category among the colours (for filtering). */
export function getGroupEffectiveCategories(
  fabrics: CategoryFabric[] | null | undefined,
  defaultNumber: number | null | undefined
): number[] {
  const out = new Set<number>()
  for (const f of fabrics ?? []) {
    const n = getFabricGroupNumber(f, defaultNumber)
    if (n != null) out.add(n)
  }
  return Array.from(out)
}
