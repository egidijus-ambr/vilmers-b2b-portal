import { getNewBadgeDays } from "./new-badge-days"

const HOUR_MS = 60 * 60 * 1000

/**
 * Cutoff for the "New products only" filter, or null when the feature is
 * disabled (new_badge_days = 0). Uses the same getNewBadgeDays source as the
 * card badge so the two agree. Rounded down to the hour so repeated requests
 * produce identical where filters (badge uses exact ms; the filter may
 * therefore include products up to 1h past the badge cutoff).
 */
export async function getNewSinceCutoff(): Promise<Date | null> {
  const days = await getNewBadgeDays()
  if (!(days > 0)) return null
  const raw = Date.now() - days * 24 * HOUR_MS
  return new Date(Math.floor(raw / HOUR_MS) * HOUR_MS)
}

/** Parse the `new` URL param ("1" / "true"). */
export function isNewParam(value: string | null | undefined): boolean {
  return value === "1" || value === "true"
}

/** AND a createdAt >= cutoff clause into a product where filter (mutates). */
export function applyNewFilter(where: any, cutoff: Date) {
  if (!where.AND) where.AND = []
  where.AND.push({ createdAt: { gte: cutoff.toISOString() } })
}
