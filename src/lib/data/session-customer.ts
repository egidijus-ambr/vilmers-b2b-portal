import "server-only"

import { cache } from "react"
import { retrieveCustomer } from "./customer"

/**
 * Request-scoped memo of retrieveCustomer() (backend getMe, no-cache fetch).
 *
 * Use this from server-component render paths that only need "who is the
 * current user according to the backend" (layout, acting customer, the
 * show-all-products gate) so they share ONE getMe round trip per request.
 *
 * Deliberately a separate accessor: retrieveCustomer itself stays uncached
 * because login / magic-link server actions call it right after writing a
 * new token, and a memoized pre-login null there would be wrong. Outside a
 * React server render, `cache` is a passthrough, so this is always safe.
 */
//
// The lambda is load-bearing: customer.ts -> show-all-products.ts -> this
// module -> customer.ts is an import cycle, so `retrieveCustomer` must be read
// at call time, never at module evaluation (TDZ when customer.ts loads first).
export const getSessionCustomer = cache(async () => retrieveCustomer())
