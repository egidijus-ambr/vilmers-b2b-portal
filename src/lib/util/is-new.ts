/**
 * True when `date` is within the last `days` days. False when days <= 0
 * (feature disabled) or the date is missing/invalid.
 */
export function isNewWithinDays(
  date: string | Date | null | undefined,
  days: number
): boolean {
  if (!date || !(days > 0)) return false
  const time = new Date(date).getTime()
  if (Number.isNaN(time)) return false
  return time > Date.now() - days * 24 * 60 * 60 * 1000
}
