import { unstable_cache } from "next/cache"
import { CMS_FLUSH_TAG, v1SharedGet } from "./cms-v1"

/**
 * The shop's default price list id: GET /catalog/price-lists/default (the
 * same for every caller: no session read, no bearer), cached 300 s (the
 * backend's max-age). Errors propagate (required data; a 503 means there is
 * no default list), as before.
 *
 * On v1 paths the server applies the default list itself; this is only
 * read by the GraphQL fallbacks (getCustomerFilterData, the GraphQL
 * configurator) - delete with them (./v1-transport-rule.ts).
 */
const DEFAULT_PRICELIST_TTL_SECONDS = 300

async function fetchDefaultPriceListId(): Promise<number> {
  const body = await v1SharedGet<{ id: number }>("/catalog/price-lists/default")
  if (typeof body?.id !== "number") throw new Error("default price list: no id")
  return body.id
}

export const getDefaultPriceListId = unstable_cache(
  fetchDefaultPriceListId,
  ["v1-default-pricelist-id"],
  { revalidate: DEFAULT_PRICELIST_TTL_SECONDS, tags: ["default-pricelist", CMS_FLUSH_TAG] }
)
