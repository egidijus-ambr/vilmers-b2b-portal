// "Prices valid from" date shown on the price-list export (cover sheet date
// and the Info sheet's "Prices as of" row). Pure — no exceljs import — so it
// can be exercised directly by scripts/verify-pricelist-valid-from.ts.
//
// `valid_from` is a DB date (`@db.Date`) that the backend serializes as UTC
// midnight (e.g. "2026-03-01T00:00:00.000Z"). Values are compared by epoch
// time only, so no local-timezone interpretation happens here; the writers
// format the result with UTC getters, which prints that same calendar date.

export type ValidFromInput = string | Date | null | undefined

function toTime(value: ValidFromInput): number | null {
  if (value === null || value === undefined || value === "") return null
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

/**
 * Latest valid date among `dates`, or `null` when none is set (null,
 * undefined, empty and unparsable values are ignored).
 */
export function latestValidFrom(
  dates: readonly ValidFromInput[]
): Date | null {
  let max: number | null = null
  for (const value of dates) {
    const time = toTime(value)
    if (time !== null && (max === null || time > max)) max = time
  }
  return max === null ? null : new Date(max)
}
