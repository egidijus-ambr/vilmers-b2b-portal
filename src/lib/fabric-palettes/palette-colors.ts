// Pure helpers for per-palette colour selection / display-name overrides.
// Data lives on the FabricGroupToFabricPalette join row as Json scalars:
//   color_codes:     string[] | null   (null = every colour of the group)
//   color_overrides: [{ code, name?, category?, ... }] | null  (`name` and `category` are used)
// No React, relative imports only (runnable via sucrase-node).

export type PaletteColorRow = {
  id?: number
  fabric_palette?: { id: number } | null
  color_codes?: unknown
  color_overrides?: unknown
}

const CATEGORY_RE = /^\s*(?:cat\s*)?(\d+)\s*$/i

const LETTER_RE = /^\s*(?:cat\s*)?([a-z])\s*$/i

/**
 * "1", "CAT 3", 3 -> number. A single letter A/B -> 11/12 (10 + alphabet index,
 * ERP convention). Anything else (other letters, "") -> null.
 */
export function parseCategory(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null
  const m = CATEGORY_RE.exec(String(v))
  if (m) return Number(m[1])
  const l = LETTER_RE.exec(String(v))
  if (l) {
    const idx = l[1].toUpperCase().charCodeAt(0) - 64
    return idx === 1 || idx === 2 ? 10 + idx : null
  }
  return null
}

const warnedCategories = new Set<string>()

/** null = all colours. Malformed input fails open (null) with a warning. */
export function parseColorCodes(v: unknown): string[] | null {
  if (v === null || v === undefined) return null
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    console.warn("[palette-colors] malformed color_codes, showing all colours", v)
    return null
  }
  return (v as string[]).map((c) => c.trim())
}

/** Malformed input yields []. Only `code`, `name` and raw `category` are kept. */
export function parseColorOverrides(
  v: unknown
): { code: string; name?: string; category?: unknown }[] {
  if (!Array.isArray(v)) return []
  const out: { code: string; name?: string; category?: unknown }[] = []
  for (const item of v) {
    if (!item || typeof item !== "object") continue
    const { code, name, category } = item as {
      code?: unknown
      name?: unknown
      category?: unknown
    }
    if (typeof code !== "string") continue
    out.push({
      code: code.trim(),
      ...(typeof name === "string" ? { name } : {}),
      ...(category !== undefined && category !== null ? { category } : {}),
    })
  }
  return out
}

export function resolvePaletteFabrics<
  F extends { code: string; color_name?: string | null },
>(
  fabrics: F[],
  rows: PaletteColorRow[],
  /** `validNumbers`: the manufacturer's group_numbers a category override may point at. */
  opts: { validNumbers?: number[] } = {}
): Array<
  F & {
    color_name: string | null
    default_color_name: string | null
    color_search_names: string[]
    /** Resolved palette category override; null = use the group default. */
    price_group_number: number | null
  }
> {
  const valid = opts.validNumbers ? new Set(opts.validNumbers) : null
  const parsed = rows.map((r, i) => ({
    key: String(r.fabric_palette?.id ?? r.id ?? `#${i}`),
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
      price_group_number: number | null
    }
  > = []
  for (const f of fabrics) {
    const code = f.code.trim()
    if (!all && !allowed.has(code)) continue
    const def = f.color_name ?? null
    const names: string[] = []
    let category: number | null = null
    for (const p of parsed) {
      if (p.codes !== null && !p.codes.includes(code)) continue
      const o = p.overrides.find((x) => x.code === code && x.name?.trim())
      if (o) names.push(o.name!.trim())
      if (category === null) {
        for (const x of p.overrides) {
          if (x.code !== code || x.category === undefined) continue
          const n = parseCategory(x.category)
          if (n !== null && (!valid || valid.has(n))) {
            category = n
            break
          }
          const wk = `${p.key}:${code}`
          if (!warnedCategories.has(wk)) {
            warnedCategories.add(wk)
            console.warn(
              `[palette-colors] unresolvable category ${JSON.stringify(x.category)} for colour ${code} in palette ${p.key}, using group default`
            )
          }
        }
      }
    }
    const searchNames = Array.from(
      new Set([...names, ...(def ? [def] : [])])
    )
    result.push({
      ...f,
      color_name: names[0] ?? def,
      default_color_name: def,
      color_search_names: searchNames,
      price_group_number: category,
    })
  }
  return result
}
