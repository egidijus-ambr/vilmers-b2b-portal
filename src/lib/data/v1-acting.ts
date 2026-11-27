import "server-only"

/**
 * X-Acting-Customer-Id for every v1 call (catalogue, /me surfaces, BFF
 * proxies): the acting cookie, sent ONLY when the backend's current role of
 * the session customer (getSessionCustomer, i.e. GET /me without the header,
 * or GraphQL getMe on a legacy session) is agent or admin.
 *
 * That is today's portal rule (src/lib/util/roles.ts isAgentOrAdmin), kept on
 * purpose: the backend also lets `manager` act (D9, src/auth/scopes.ts
 * ACTING_ROLES), the portal does not yet. getMe is only consulted when the
 * cookie is set.
 */
import { cookies } from "next/headers"
import { ACTING_CUSTOMER_COOKIE } from "@lib/util/acting-customer-cookie"
import { isAgentOrAdmin } from "@lib/util/roles"
import { getActingCustomerId } from "./acting-customer"
import { getSessionCustomer } from "./session-customer"
import { dropActingIfConfirmedStale } from "@lib/furnisystems-sdk/client/v1-data"
import { v1GetMeActing } from "./me-v1"

export async function actingCustomerIdForV1(): Promise<number | null> {
  const id = await getActingCustomerId()
  if (id == null || id <= 0) return null
  try {
    const me = await getSessionCustomer()
    return isAgentOrAdmin(me) ? id : null
  } catch {
    return null
  }
}

/**
 * Deletes a stale acting cookie. Throws inside a server-component render
 * (read-only cookies); callers (withActingRetry) ignore that.
 */
export async function dropActingCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ACTING_CUSTOMER_COOKIE)
}

/**
 * onStaleActing for acting-narrowed resources (order detail, invoice, file):
 * drops the cookie only when GET /me with the header confirms a 404.
 */
export function dropActingCookieIfStale(
  bearer: string,
  actingCustomerId: number | null
): () => Promise<void> {
  if (actingCustomerId === null) return async () => undefined
  return dropActingIfConfirmedStale(
    () => v1GetMeActing(bearer, actingCustomerId),
    dropActingCookie
  )
}
