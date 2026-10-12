// Pure helpers for per-palette colour selection / display-name overrides.
// Data lives on the FabricGroupToFabricPalette join row as Json scalars:
//   color_codes:     string[] | null   (null = every colour of the group)
//   color_overrides: [{ code, name?, ... }] | null  (only `name` is used)
// No React, relative imports only (runnable via sucrase-node).

export type PaletteColorRow = {
  color_codes?: unknown
  color_overrides?: unknown
}

/** null = all colours. Malformed input fails open (null) with a warning. */
export function parseColorCodes(v: unknown): string[] | null {
  if (v === null || v === undefined) return null
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    console.warn("[palette-colors] malformed color_codes, showing all colours", v)
    return null
  }
  return (v as string[]).map((c) => c.trim())
}

/** Malformed input yields []. Only `code` and `name` are kept. */
export function parseColorOverrides(
  v: unknown
): { code: string; name?: string }[] {
  if (!Array.isArray(v)) return []
  const out: { code: string; name?: string }[] = []
  for (const item of v) {
    if (!item || typeof item !== "object") continue
    const { code, name } = item as { code?: unknown; name?: unknown }
    if (typeof code !== "string") continue
    out.push({
      code: code.trim(),
      ...(typeof name === "string" ? { name } : {}),
    })
  }
  return out
}

export function resolvePaletteFabrics<
  F extends { code: string; color_name?: string | null },
>(
  fabrics: F[],
  rows: PaletteColorRow[]
): Array<
  F & {
    color_name: string | null
    default_color_name: string | null
    color_search_names: string[]
  }
> {
  const parsed = rows.map((r) => ({
    codes: parseColorCodes(r.color_codes),
    overrides: parseColorOverrides(r.color_overrides),
  }))
  const all = parsed.length === 0 || parsed.some((p) => p.codes === null)
  const allowed = new Set<string>()
  if (!all) parsed.forEach((p) => p.codes!.forEach((c) => allowed.add(c)))

  const result: Array<
    F & {
      color_name: string | null
      default_color_name: string | null
      color_search_names: string[]
    }
  > = []
  for (const f of fabrics) {
    const code = f.code.trim()
    if (!all && !allowed.has(code)) continue
    const def = f.color_name ?? null
    const names: string[] = []
    for (const p of parsed) {
      if (p.codes !== null && !p.codes.includes(code)) continue
      const o = p.overrides.find((x) => x.code === code && x.name?.trim())
      if (o) names.push(o.name!.trim())
    }
    const searchNames = Array.from(
      new Set([...names, ...(def ? [def] : [])])
    )
    result.push({
      ...f,
      color_name: names[0] ?? def,
      default_color_name: def,
      color_search_names: searchNames,
    })
  }
  return result
}
