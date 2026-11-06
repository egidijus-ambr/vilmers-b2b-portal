/**
 * Pure helper for the pricelist cover sheet: turns the acting customer's
 * DIRECT additional components into one printed line per admin-selected
 * component group (ShopSetting.pricelist_cover_component_group_ids).
 */

export interface CoverComponentInput {
  additionalComponent?: {
    id?: number | null
    code?: string | null
    additional_component_group?: { id?: number | null } | null
  } | null
}

/** Placeholder "no market" codes that count as no value (compared case-insensitively). */
const PLACEHOLDER_CODES = ["be rinkos"]

const isPlaceholder = (code: string) =>
  PLACEHOLDER_CODES.includes(code.trim().toLowerCase())

/**
 * One line per group id, in the configured order: the customer's component
 * codes in that group joined with ", " (sorted by component id). Groups with
 * no value are skipped. When nothing resolves, falls back to the legacy
 * free-text terms as a single line (or [] when that is empty too).
 */
export function resolveCoverLines(
  components: CoverComponentInput[] | null | undefined,
  groupIds: number[] | null | undefined,
  legacyTerms: string | null | undefined
): string[] {
  const lines: string[] = []
  const seenGroups = new Set<number>()
  for (const groupId of groupIds ?? []) {
    if (seenGroups.has(groupId)) continue
    seenGroups.add(groupId)
    const codes = (components ?? [])
      .map((c) => c?.additionalComponent)
      .filter(
        (ac): ac is NonNullable<typeof ac> =>
          !!ac && ac.additional_component_group?.id === groupId
      )
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      .map((ac) => (ac.code ?? "").trim())
      .filter((code) => code !== "" && !isPlaceholder(code))
    if (codes.length > 0) lines.push(codes.join(", "))
  }
  if (lines.length > 0) return lines
  const legacy = (legacyTerms ?? "").trim()
  return legacy ? [legacy] : []
}
