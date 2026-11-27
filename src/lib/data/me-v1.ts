import "server-only"

/**
 * REST v1 identity reads (portal REST migration slice 7: 2c-7 orders, 2c-8
 * palettes, 2c-9 managed customers, 2c-10 identity) behind the existing data
 * functions in ./{orders,fabric-palettes,customer-search,acting-customer,
 * show-all-products}.ts and src/lib/util/session-validation.ts.
 *
 * NOT a "use server" module: nothing here may be callable from the browser
 * (every function takes a bearer). Every call is `cache: "no-store"`
 * (src/lib/furnisystems-sdk/client/v1-data.ts); the only memo is React
 * `cache` (one render / request), never unstable_cache or any shared cache.
 */
import { cache } from "react"
import {
  isV1ProblemError,
  v1DataGet,
  type V1Query,
} from "@lib/furnisystems-sdk/client/v1-data"
import type {
  V1AuthSession,
  V1ManagedCustomer,
  V1Me,
  V1OrderDetail,
  V1OrderListItem,
  V1PageMeta,
  V1Palette,
} from "@lib/furnisystems-sdk/modules/customer/v1-adapter"
import { getV1RequestContext } from "./v1-transport"

const restApiUrl = () => process.env.NEXT_PUBLIC_BACKEND_REST_API || ""

function meGet<T>(
  bearer: string,
  path: string,
  options: { query?: V1Query; actingCustomerId?: number | null } = {}
): Promise<T> {
  return v1DataGet<T>(
    { restApiUrl: restApiUrl() },
    {
      path,
      query: options.query,
      bearer,
      actingCustomerId: options.actingCustomerId ?? null,
    }
  )
}

/** Short, token-free description of a v1 failure for the logs. */
export function describeV1Error(error: unknown): string {
  if (isV1ProblemError(error)) {
    return `${error.status} ${error.code ?? ""} ${error.requestId ?? ""}`.trim()
  }
  return error instanceof Error ? error.name : "unknown error"
}

/**
 * Runs an identity read on the transport of this request
 * (./v1-transport-rule.ts selectIdentityTransport):
 *   guest   -> `guest()` (no backend call)
 *   graphql -> `graphql()` (the unchanged legacy path)
 *   v1      -> `v1(bearer)`; a v1 401 re-routes this one call to `graphql()`
 *              (the token was not usable after all; the legacy `_furni_jwt`
 *              may still be); any other failure is logged and `onError(e)`
 *              decides (fail closed: no data, never another identity).
 */
export async function runIdentityCall<T>(
  label: string,
  calls: {
    v1: (bearer: string) => Promise<T>
    graphql: () => Promise<T>
    guest: () => T | Promise<T>
    onError: (error: unknown) => T | Promise<T>
  }
): Promise<T> {
  const ctx = await getV1RequestContext()
  if (ctx.identity === "guest") return calls.guest()
  if (ctx.identity === "graphql" || !ctx.bearer) return calls.graphql()
  try {
    return await calls.v1(ctx.bearer)
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401) {
      console.warn(`[me-v1] ${label}: 401, using the GraphQL path`)
      return calls.graphql()
    }
    console.error(`[me-v1] ${label} failed:`, describeV1Error(error))
    return calls.onError(error)
  }
}

/** GET /me WITHOUT the acting header: the caller itself (GraphQL getMe). */
export const v1GetMeSelf = cache(
  async (bearer: string): Promise<V1Me> => meGet<V1Me>(bearer, "/me")
)

/** GET /auth/session: principal (DB roles), permissions, session kind. */
export const v1GetAuthSession = cache(
  async (bearer: string): Promise<V1AuthSession> =>
    meGet<V1AuthSession>(bearer, "/auth/session")
)

/** GET /me WITH X-Acting-Customer-Id: the customer acted for. */
export const v1GetMeActing = cache(
  async (bearer: string, actingCustomerId: number): Promise<V1Me> =>
    meGet<V1Me>(bearer, "/me", { actingCustomerId })
)

/** v1 page-size bound of /me/orders and /me/managed-customers. */
export const V1_MAX_PAGE_SIZE = 50

export function v1ListOrders(
  bearer: string,
  actingCustomerId: number | null,
  p: { page: number; pageSize: number; search?: string }
): Promise<{ data: V1OrderListItem[]; meta: V1PageMeta }> {
  return meGet(bearer, "/me/orders", {
    query: { page: p.page, pageSize: p.pageSize, search: p.search },
    actingCustomerId,
  })
}

export function v1GetOrder(
  bearer: string,
  actingCustomerId: number | null,
  orderId: string
): Promise<V1OrderDetail> {
  return meGet(bearer, `/me/orders/${encodeURIComponent(orderId)}`, {
    actingCustomerId,
  })
}

export function v1ListPalettes(
  bearer: string,
  actingCustomerId: number | null
): Promise<{ data: V1Palette[] }> {
  return meGet(bearer, "/me/palettes", { actingCustomerId })
}

export function v1ListManagedCustomers(
  bearer: string,
  p: { search?: string; pageSize: number }
): Promise<{ data: V1ManagedCustomer[]; meta: V1PageMeta }> {
  return meGet(bearer, "/me/managed-customers", {
    query: { page: 1, pageSize: p.pageSize, search: p.search },
  })
}
