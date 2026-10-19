import "server-only"

import { NextResponse } from "next/server"
import { validateSession } from "@lib/util/session-validation"
import { getActingCustomer } from "@lib/data/acting-customer"
import { getPrimaryPriceListId } from "@configurator/lib/pricelist"
import { features } from "@lib/features"

export interface ExportContext {
  priceListId: number
  /** Sorted ascending, de-duplicated. */
  tagIds: number[]
}

/**
 * Shared precondition chain for every pricelist-export route: feature flag,
 * session, acting customer, effective price list, tag ids. The returned
 * (priceListId, tagIds) are ALWAYS derived server-side from the session --
 * nothing here (or in the routes) accepts them from the client.
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
  if (!features.pricelistExport) return fail("not_found", 404)

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

  const priceListId = getPrimaryPriceListId(customer)
  // Never fall back to a default pricelist: it would export wrong prices.
  if (priceListId == null) return fail("no_pricelist", 409)

  // Tags come straight off the already-resolved customer (see the original
  // route's comment: a second getCustomerFilterData() call could resolve a
  // different customer branch than the one that picked the pricelist).
  const tagIds: number[] = Array.from(
    new Set<number>(customer?.tags?.map((t: { id: number }) => t.id) ?? [])
  ).sort((a, b) => a - b)

  return { ok: true, context: { priceListId, tagIds } }
}
