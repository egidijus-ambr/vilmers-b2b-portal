import "server-only"

import { NextResponse } from "next/server"
import { validateSession } from "@lib/util/session-validation"
import { getActingCustomer } from "@lib/data/acting-customer"
import { getPrimaryPriceListId } from "@configurator/lib/pricelist"
import { getPricelistSettings } from "@lib/data/pricelist-settings"
import { resolveCoverLines } from "@lib/util/pricelist-cover-components"

export interface ExportContext {
  /**
   * The customer in scope (getActingCustomer: the acting target, else the
   * session customer). Binds a job / file to its customer.
   */
  customerId: number
  /**
   * GraphQL arm ONLY (legacy sessions, a v1 401): the locally derived
   * effective price list (null = none) and tag ids. On v1 the server picks
   * both and the answer's values are used (./pricelist-export-source.ts).
   */
  localPriceListId: number | null
  /** GraphQL arm only. Sorted ascending, de-duplicated. */
  localTagIds: number[]
  /**
   * Cover lines for the acting customer (component codes per configured
   * group, or the legacy terms). Empty when the cover is off, so customers
   * never fragment the cache for a cover that is not printed.
   */
  coverLines: string[]
}

/**
 * Shared precondition chain for every pricelist-export route: admin setting (ShopSetting.pricelist_export_enabled),
 * session, acting customer, cover lines (and, for the GraphQL arm only, the
 * local effective price list and tag ids). Nothing here (or in the routes)
 * accepts a customer, price list or tag from the client. The "no price
 * list" check is the transport's (./pricelist-export-source.ts): on v1 the
 * server answers it (409 EXPORT_NO_PRICE_LIST).
 *
 * Error codes and status codes are unchanged from the original GET route.
 */
export async function resolveExportContext(): Promise<
  { ok: true; context: ExportContext } | { ok: false; response: NextResponse }
> {
  const fail = (error: string, status: number) => ({
    ok: false as const,
    response: NextResponse.json({ error }, { status }),
  })

  // 404 (not 403) when off: do not confirm the resource exists. Checked
  // before validateSession() and any data access.
  const settings = await getPricelistSettings()
  if (!settings.exportEnabled) return fail("not_found", 404)

  const sessionValidation = await validateSession()
  if (!sessionValidation.isValid) return fail("unauthorized", 401)

  let customer: any = null
  try {
    customer = await getActingCustomer()
  } catch (error) {
    // A real throw (backend outage) is not "no acting customer".
    console.error("[pricelist-export] Failed to resolve acting customer:", error)
    return fail("fetch_failed", 502)
  }
  if (!customer) return fail("no_customer", 409)

  const customerId = Number(customer?.id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return fail("no_customer", 409)
  }

  // GraphQL arm only. Never fall back to a default pricelist (wrong prices):
  // a null list is answered `no_pricelist` by that arm.
  const localPriceListId = getPrimaryPriceListId(customer) ?? null

  // Tags come straight off the already-resolved customer (see the original
  // route's comment: a second getCustomerFilterData() call could resolve a
  // different customer branch than the one that picked the pricelist).
  const localTagIds: number[] = Array.from(
    new Set<number>(customer?.tags?.map((t: { id: number }) => t.id) ?? [])
  ).sort((a, b) => a - b)

  const coverLines = settings.coverEnabled
    ? resolveCoverLines(
        customer?.additional_components,
        settings.coverComponentGroupIds,
        settings.coverTerms,
        customer?.delivery_terms
      )
    : []

  return {
    ok: true,
    context: { customerId, localPriceListId, localTagIds, coverLines },
  }
}
