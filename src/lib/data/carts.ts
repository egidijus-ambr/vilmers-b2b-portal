"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import {
  AddCartItemInput,
  CartSummary,
  FurnisystemsCart,
} from "@lib/furnisystems-sdk/modules/cart/types"
import { getActingCustomer } from "./acting-customer"
import { toActionError, type ActionError } from "@lib/fabric-palettes/palette-error"
import { actingCustomerIdForV1 } from "./v1-acting"
import {
  runCartCall,
  v1ActivateCart,
  v1AddCartItem,
  v1DeleteCart,
  v1GetActiveCart,
  v1GetCart,
  v1ListCarts,
  v1RemoveCartItem,
  v1RenameCart,
  v1StartNewCart,
  v1UpdateCartItem,
  resolveV1CartCaller,
  type V1CartCaller,
} from "./carts-v1"

/*
 * Carts on REST v1 (portal REST slice 8, /me/carts*) when the request has a
 * usable v1 access token; the sdk.cart GraphQL calls are the unchanged path
 * for legacy-only sessions and the target of a v1 401 (./carts-v1.ts
 * runCartCall). Every v1 call carries the acting header (v1 owns carts by
 * the acting scope) and none is retried without it.
 */

/**
 * Resolve the Customer (company) id whose carts we should operate on, using the
 * canonical `getActingCustomer` resolver so the carts page stays in lockstep
 * with the cart-context. That resolver respects role: a normal/impersonated
 * end-customer always resolves to themselves and a stale acting-customer cookie
 * is ignored; only agents/admins honor the cookie (and a stale one degrades to
 * null). Returns null for guests.
 */
async function resolveActingCustomerId(): Promise<number | null> {
  const acting = await getActingCustomer()
  return acting?.id != null ? Number(acting.id) : null
}

/**
 * The v1 caller (bearer + acting header) of one cart call. v1 transport
 * only: the GraphQL arms below are exactly the pre-v1 calls (no extra
 * lookups). `knownOwner`: the owner the action already resolved (the
 * owner-gated actions); omitted = resolved here, and only when an acting
 * header is going to be sent. See ./carts-v1.ts resolveV1CartCaller.
 */
function v1Caller(bearer: string, knownOwner?: number | null): Promise<V1CartCaller> {
  return resolveV1CartCaller(
    bearer,
    { actingHeader: actingCustomerIdForV1, owner: resolveActingCustomerId },
    knownOwner
  )
}

const AUTH_REQUIRED = "Authentication required"

/**
 * The `error` string of the {ok,error?: string} actions: a v1 problem's
 * backend-written `detail` (toActionError), else exactly the pre-v1
 * expression (GraphQL / legacy sessions unchanged).
 */
function stringError(error: any, fallback: string): string {
  return error?.name === "V1ProblemError"
    ? toActionError(error, fallback).message
    : error?.message ?? fallback
}

export const listCarts = async (): Promise<CartSummary[]> => {
  unstable_noStore()

  try {
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return []
    return await runCartCall("listCarts", {
      v1: async (bearer) => v1ListCarts(await v1Caller(bearer, customerId)),
      graphql: () => sdk.cart.getCustomerCarts(customerId),
    })
  } catch (error) {
    console.error("[listCarts] Error fetching carts:", error)
    return []
  }
}

export const getCartDetail = async (
  cartId: number
): Promise<FurnisystemsCart | null> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return null
    // Backend re-authorizes access by cart owner (v1: the acting scope, or
    // the caller's own customer without a selected customer; a cart outside
    // it is 404 -> null, "not found").
    return await runCartCall("getCartDetail", {
      v1: async (bearer) => v1GetCart(await v1Caller(bearer), cartId),
      graphql: () => sdk.cart.getCartById(cartId),
    })
  } catch (error) {
    console.error("[getCartDetail] Error fetching cart:", error)
    return null
  }
}

export const renameCartAction = async (
  cartId: number,
  name: string
): Promise<{ ok: boolean; error?: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: AUTH_REQUIRED }
    await runCartCall("renameCart", {
      v1: async (bearer) => v1RenameCart(await v1Caller(bearer), cartId, name),
      graphql: () => sdk.cart.renameCart(cartId, name),
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[renameCartAction] Error renaming cart:", error)
    return { ok: false, error: stringError(error, "Failed to rename cart") }
  }
}

export const setActiveCartAction = async (
  cartId: number
): Promise<{ ok: boolean; error?: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: AUTH_REQUIRED }
    await runCartCall("setActiveCart", {
      v1: async (bearer) => v1ActivateCart(await v1Caller(bearer), cartId),
      graphql: () => sdk.cart.setActiveCart(cartId),
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[setActiveCartAction] Error setting active cart:", error)
    return { ok: false, error: stringError(error, "Failed to set active cart") }
  }
}

export const startNewCartAction = async (): Promise<{
  ok: boolean
  error?: string
}> => {
  unstable_noStore()

  try {
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return { ok: false, error: AUTH_REQUIRED }
    await runCartCall("startNewCart", {
      v1: async (bearer) => v1StartNewCart(await v1Caller(bearer, customerId)),
      graphql: () => sdk.cart.startNewCart(customerId),
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[startNewCartAction] Error starting new cart:", error)
    return { ok: false, error: stringError(error, "Failed to start new cart") }
  }
}

export const deleteCartAction = async (
  cartId: number
): Promise<{ ok: boolean; error?: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: AUTH_REQUIRED }
    // 409 CONFLICT: a line of the cart belongs to an order (the backend's
    // detail is the GraphQL message, shown as before).
    await runCartCall("deleteCart", {
      v1: async (bearer) => v1DeleteCart(await v1Caller(bearer), cartId),
      graphql: async () => {
        await sdk.cart.deleteCart(cartId)
      },
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[deleteCartAction] Error deleting cart:", error)
    return { ok: false, error: stringError(error, "Failed to delete cart") }
  }
}

/**
 * Add an item to a cart. Runs server-side so the SDK attaches the cookie
 * auth token (the browser SDK has no token), which the backend needs for
 * palette enforcement and the cart ownership check. Errors are returned, not
 * thrown, because production redacts thrown server-action error details.
 *
 * The target cart is resolved server-side as the active cart of the acting
 * customer (same resolver as `getActiveCartAction`); the client-supplied
 * `expectedCartId` is only a consistency check. If the acting customer (or
 * their active cart) changed since the client loaded its cart, e.g. an agent
 * switched customer in another tab, the ids differ and the add is refused
 * with code "CART_CHANGED" instead of writing into a cart the UI is not
 * showing. (No exported constant: "use server" modules may only export
 * async functions.)
 */
export const addCartItemAction = async (
  expectedCartId: number,
  input: AddCartItemInput
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    const customerId = await resolveActingCustomerId()
    if (customerId == null) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    const cartChanged = {
      ok: false as const,
      error: {
        message: "Your cart has changed. Please review it and try again.",
        code: "CART_CHANGED",
      },
    }
    // Active cart and the add on the SAME transport and the same acting
    // scope; the add targets the path id of the cart just confirmed.
    const added = await runCartCall<boolean>("addCartItem", {
      v1: async (bearer) => {
        const c = await v1Caller(bearer, customerId)
        const activeCart = await v1GetActiveCart(c)
        if (
          Number(activeCart.id) !== Number(expectedCartId) ||
          Number(activeCart.customerId) !== customerId
        ) {
          return false
        }
        await v1AddCartItem(c, activeCart.id, input)
        return true
      },
      graphql: async () => {
        const activeCart = await sdk.cart.getOrCreateActiveCart(customerId)
        if (!activeCart || Number(activeCart.id) !== Number(expectedCartId)) {
          return false
        }
        await sdk.cart.addItem(activeCart.id, input)
        return true
      },
    })
    if (!added) return cartChanged
    return { ok: true }
  } catch (error: any) {
    console.error("[addCartItemAction] Error adding item:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to add item to cart"),
    }
  }
}

/**
 * Fetch (or create) the active cart for the acting customer. Runs server-side
 * so the SDK attaches the cookie auth token. The customer is resolved from the
 * session via `resolveActingCustomerId()` (agents/admins act for the selected
 * customer); a customer id is never accepted from the client.
 */
export const getActiveCartAction = async (): Promise<
  { ok: true; cart: FurnisystemsCart | null } | { ok: false; error: ActionError }
> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return { ok: true, cart: null }
    const cart = await runCartCall("getActiveCart", {
      v1: async (bearer) => v1GetActiveCart(await v1Caller(bearer, customerId)),
      graphql: () => sdk.cart.getOrCreateActiveCart(customerId),
    })
    return { ok: true, cart }
  } catch (error: any) {
    console.error("[getActiveCartAction] Error fetching active cart:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to fetch cart"),
    }
  }
}

export const updateCartItemQuantityAction = async (
  cartId: number,
  cartItemId: number,
  quantity: number
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    await runCartCall("updateCartItemQuantity", {
      v1: async (bearer) => {
        await v1UpdateCartItem(await v1Caller(bearer), cartId, cartItemId, { quantity })
      },
      graphql: async () => {
        await sdk.cart.updateItemQuantity(cartItemId, quantity)
      },
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[updateCartItemQuantityAction] Error updating quantity:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to update quantity"),
    }
  }
}

export const updateCartItemReferenceAction = async (
  cartId: number,
  cartItemId: number,
  reference: string
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    await runCartCall("updateCartItemReference", {
      v1: async (bearer) => {
        await v1UpdateCartItem(await v1Caller(bearer), cartId, cartItemId, { reference })
      },
      graphql: async () => {
        await sdk.cart.updateItemReference(cartItemId, reference)
      },
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[updateCartItemReferenceAction] Error updating reference:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to update reference"),
    }
  }
}

export const removeCartItemAction = async (
  cartId: number,
  cartItemId: number
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: AUTH_REQUIRED } }
    }
    await runCartCall("removeCartItem", {
      v1: async (bearer) => {
        await v1RemoveCartItem(await v1Caller(bearer), cartId, cartItemId)
      },
      graphql: async () => {
        await sdk.cart.removeItem(cartItemId)
      },
    })
    return { ok: true }
  } catch (error: any) {
    console.error("[removeCartItemAction] Error removing item:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to remove item"),
    }
  }
}
