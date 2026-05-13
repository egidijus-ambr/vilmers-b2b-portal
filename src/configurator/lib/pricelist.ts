/**
 * Pricelist priority helpers for the configurator.
 *
 * A customer can be priced via two sources:
 *   - `price_listId` — direct (assigned to the customer)
 *   - `group_price_listId` — via the customer's group
 *
 * Direct wins for the actual charge. When matching "is the component priced
 * for this customer at all", both should be considered.
 *
 * NOTE: The customer SDK types model these as optional strings (the JWT/GraphQL
 * payload returns them as strings); some shapes (e.g. SearchCustomerResult)
 * use number | null. The helpers below normalise both via Number() and treat
 * NaN as "not set".
 */

type PriceListSource = string | number | null | undefined

type CustomerLike = {
  price_listId?: PriceListSource
  group_price_listId?: PriceListSource
} | null | undefined

const toId = (v: PriceListSource): number | null => {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Returns the customer's effective pricelist IDs in priority order.
 * The first entry (if any) is the direct pricelist; the second is the group's,
 * if present and distinct.
 *
 * Order matters: callers that need a single ID should take the first; callers
 * that match "any of" should treat the whole list as the set.
 */
export function getCustomerPriceListIds(customer: CustomerLike): number[] {
  const ids: number[] = []
  const direct = toId(customer?.price_listId)
  const group = toId(customer?.group_price_listId)
  if (direct != null) ids.push(direct)
  if (group != null && group !== direct) ids.push(group)
  return ids
}

/**
 * Returns the priority pricelist ID for the customer — direct if set, else
 * group, else null. Use this for "what should the customer be charged?".
 */
export function getPrimaryPriceListId(customer: CustomerLike): number | null {
  const ids = getCustomerPriceListIds(customer)
  return ids[0] ?? null
}
