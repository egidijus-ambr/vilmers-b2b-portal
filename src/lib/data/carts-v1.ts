import "server-only"

/**
 * Carts and cart offers on REST v1 (portal REST migration slices 8 and 9;
 * backend 13c1182) behind the server actions of ./carts.ts and
 * ./offer-pdf.ts.
 *
 * NOT a "use server" module: every function takes a bearer, so nothing here
 * may be callable from the browser.
 *
 * Scope: v1 owns a cart by the ACTING SCOPE only (the caller's customer, or
 * the X-Acting-Customer-Id customer; never a customer id from the client).
 * Without the header an agent gets 404 for a managed customer's cart. So
 * EVERY cart and offer call sends the acting id of ./v1-acting.ts
 * actingCustomerIdForV1 (agent / admin with a selected customer), reads and
 * writes alike, and NONE is wrapped in withActingRetry /
 * withActingRetryIfStale: a retry without the header would read, or WRITE,
 * the agent's own cart. A refused acting header (403 ACTING_NOT_ALLOWED) or
 * a stale one (404) surfaces as an error.
 *
 * Transport (./v1-transport-rule.ts, via ./me-v1.ts runIdentityCall): v1
 * with a usable v1 token; legacy-only sessions keep the GraphQL SDK calls; a
 * v1 401 re-runs that one call on GraphQL (nothing was written: the 401 is
 * answered before the handler); every other v1 failure is THROWN to the
 * action, which turns it into its usual error answer (fail closed).
 * The checkout (createNewOrder) stays on GraphQL and reads / removes the
 * same rows: ids are shared.
 */
import {
  v1DataDelete,
  v1DataGet,
  v1DataPatch,
  v1DataPost,
} from "@lib/furnisystems-sdk/client/v1-data"
import {
  mapV1Cart,
  mapV1CartItem,
  mapV1CartOffer,
  mapV1CartSummaries,
  toV1AddCartItemBody,
  v1CartOfferQuery,
  v1CartPathId,
  type V1Cart,
  type V1CartItem,
  type V1CartOffer,
  type V1CartSummary,
} from "@lib/furnisystems-sdk/modules/cart/v1-adapter"
import type {
  AddCartItemInput,
  CartSummary,
  FurnisystemsCart,
  FurnisystemsCartItem,
} from "@lib/furnisystems-sdk/modules/cart/types"
import type {
  CartOfferData,
  GetCartOfferDataOptions,
} from "@lib/furnisystems-sdk/modules/offer-pdf/types"
import { describeV1Error, runIdentityCall } from "./me-v1"

const deps = () => ({ restApiUrl: process.env.NEXT_PUBLIC_BACKEND_REST_API || "" })

/** Who the cart calls act for: the bearer and the acting header (or none). */
export interface V1CartCaller {
  bearer: string
  actingCustomerId: number | null
}

/** The acting header and the resolved cart owner disagree: nothing is sent. */
export class CartScopeMismatchError extends Error {
  constructor() {
    super("The selected customer has changed. Please reload the page and try again.")
    this.name = "CartScopeMismatchError"
  }
}

/**
 * The caller of one v1 cart / offer call, decided ONLY on the v1 transport
 * (the GraphQL arms keep their pre-v1 behaviour, no extra lookups):
 *   - no acting header (a customer login, or an agent / admin with no
 *     selected customer) -> v1 without the header: the backend scopes to
 *     the caller's own customer;
 *   - an acting header -> sent, unless the resolved owner (getActingCustomer,
 *     or `knownOwner` when the action already resolved it) is a DIFFERENT
 *     customer: then CartScopeMismatchError, nothing is sent. An owner that
 *     does not resolve (null) is not a disagreement: the backend answers the
 *     header itself (404 / 403 ACTING_NOT_ALLOWED), which surfaces as an
 *     error (no retry without the header).
 * Injectable so scripts/verify-carts-v1.ts can drive it.
 */
export async function resolveV1CartCaller(
  bearer: string,
  lookups: {
    actingHeader: () => Promise<number | null>
    owner: () => Promise<number | null>
  },
  knownOwner?: number | null
): Promise<V1CartCaller> {
  const actingCustomerId = await lookups.actingHeader()
  if (actingCustomerId !== null) {
    const owner = knownOwner !== undefined ? knownOwner : await lookups.owner()
    if (owner != null && owner !== actingCustomerId) throw new CartScopeMismatchError()
  }
  return { bearer, actingCustomerId }
}

function path(cartId: number, rest = ""): string {
  const id = v1CartPathId(cartId)
  // A malformed id never reaches the backend (the v1 route 400s it anyway).
  if (id === null) throw new Error("invalid cart id")
  return `/me/carts/${id}${rest}`
}

function itemPath(cartId: number, itemId: number): string {
  const id = v1CartPathId(itemId)
  if (id === null) throw new Error("invalid cart item id")
  return path(cartId, `/items/${id}`)
}

/**
 * Runs a cart / offer call on this request's transport. `guest` cannot
 * happen behind validateSession; it takes the unchanged GraphQL call.
 */
export function runCartCall<T>(
  label: string,
  calls: { v1: (bearer: string) => Promise<T>; graphql: () => Promise<T> }
): Promise<T> {
  return runIdentityCall<T>(label, {
    v1: calls.v1,
    graphql: calls.graphql,
    guest: calls.graphql,
    onError: (error) => {
      throw error instanceof Error
        ? error
        : new Error(`${label} failed: ${describeV1Error(error)}`)
    },
  })
}

// ---- carts ----

export async function v1ListCarts(c: V1CartCaller): Promise<CartSummary[]> {
  const body = await v1DataGet<{ data: V1CartSummary[] }>(deps(), {
    path: "/me/carts",
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1CartSummaries(body)
}

/** GET /me/carts/active (creates an empty active cart when there is none). */
export async function v1GetActiveCart(c: V1CartCaller): Promise<FurnisystemsCart> {
  const body = await v1DataGet<V1Cart>(deps(), {
    path: "/me/carts/active",
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1Cart(body)
}

export async function v1GetCart(c: V1CartCaller, cartId: number): Promise<FurnisystemsCart> {
  const body = await v1DataGet<V1Cart>(deps(), {
    path: path(cartId),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1Cart(body)
}

export async function v1StartNewCart(c: V1CartCaller): Promise<FurnisystemsCart> {
  const body = await v1DataPost<V1Cart>(deps(), {
    path: "/me/carts",
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1Cart(body)
}

export async function v1RenameCart(
  c: V1CartCaller,
  cartId: number,
  name: string
): Promise<FurnisystemsCart> {
  const body = await v1DataPatch<V1Cart>(deps(), {
    path: path(cartId),
    body: { name },
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1Cart(body)
}

export async function v1ActivateCart(c: V1CartCaller, cartId: number): Promise<FurnisystemsCart> {
  const body = await v1DataPost<V1Cart>(deps(), {
    path: path(cartId, "/activate"),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1Cart(body)
}

export async function v1DeleteCart(c: V1CartCaller, cartId: number): Promise<void> {
  await v1DataDelete(deps(), {
    path: path(cartId),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
}

// ---- lines ----

export async function v1AddCartItem(
  c: V1CartCaller,
  cartId: number,
  input: AddCartItemInput
): Promise<FurnisystemsCartItem> {
  const body = await v1DataPost<V1CartItem>(deps(), {
    path: path(cartId, "/items"),
    body: toV1AddCartItemBody(input),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1CartItem(body, cartId)
}

export async function v1UpdateCartItem(
  c: V1CartCaller,
  cartId: number,
  itemId: number,
  patch: { quantity?: number; reference?: string }
): Promise<FurnisystemsCartItem> {
  const body = await v1DataPatch<V1CartItem>(deps(), {
    path: itemPath(cartId, itemId),
    body: patch,
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1CartItem(body, cartId)
}

export async function v1RemoveCartItem(
  c: V1CartCaller,
  cartId: number,
  itemId: number
): Promise<void> {
  await v1DataDelete(deps(), {
    path: itemPath(cartId, itemId),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
}

// ---- offers ----

export async function v1GetCartOffer(
  c: V1CartCaller,
  cartId: number,
  opts: GetCartOfferDataOptions
): Promise<CartOfferData> {
  const body = await v1DataGet<V1CartOffer>(deps(), {
    path: path(cartId, "/offer"),
    query: v1CartOfferQuery(opts),
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
  return mapV1CartOffer(body)
}

export async function v1EmailCartOffer(
  c: V1CartCaller,
  cartId: number,
  input: { pdfBase64: string; recipientEmail?: string; fileName?: string }
): Promise<void> {
  await v1DataPost<{ sent: true }>(deps(), {
    path: path(cartId, "/offer/email"),
    body: {
      pdfBase64: input.pdfBase64,
      ...(input.recipientEmail ? { recipientEmail: input.recipientEmail } : {}),
      ...(input.fileName ? { fileName: input.fileName } : {}),
    },
    bearer: c.bearer,
    actingCustomerId: c.actingCustomerId,
  })
}
