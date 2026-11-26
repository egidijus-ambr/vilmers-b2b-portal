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

export const listCarts = async (): Promise<CartSummary[]> => {
  unstable_noStore()

  try {
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return []
    return await sdk.cart.getCustomerCarts(customerId)
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
    // Backend re-authorizes access by cart owner.
    return await sdk.cart.getCartById(cartId)
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
    if (!validation.isValid) return { ok: false, error: "Authentication required" }
    await sdk.cart.renameCart(cartId, name)
    return { ok: true }
  } catch (error: any) {
    console.error("[renameCartAction] Error renaming cart:", error)
    return { ok: false, error: error?.message ?? "Failed to rename cart" }
  }
}

export const setActiveCartAction = async (
  cartId: number
): Promise<{ ok: boolean; error?: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: "Authentication required" }
    await sdk.cart.setActiveCart(cartId)
    return { ok: true }
  } catch (error: any) {
    console.error("[setActiveCartAction] Error setting active cart:", error)
    return { ok: false, error: error?.message ?? "Failed to set active cart" }
  }
}

export const startNewCartAction = async (): Promise<{
  ok: boolean
  error?: string
}> => {
  unstable_noStore()

  try {
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return { ok: false, error: "Authentication required" }
    await sdk.cart.startNewCart(customerId)
    return { ok: true }
  } catch (error: any) {
    console.error("[startNewCartAction] Error starting new cart:", error)
    return { ok: false, error: error?.message ?? "Failed to start new cart" }
  }
}

export const deleteCartAction = async (
  cartId: number
): Promise<{ ok: boolean; error?: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: "Authentication required" }
    await sdk.cart.deleteCart(cartId)
    return { ok: true }
  } catch (error: any) {
    console.error("[deleteCartAction] Error deleting cart:", error)
    return { ok: false, error: error?.message ?? "Failed to delete cart" }
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
      return { ok: false, error: { message: "Authentication required" } }
    }
    const customerId = await resolveActingCustomerId()
    if (customerId == null) {
      return { ok: false, error: { message: "Authentication required" } }
    }
    const activeCart = await sdk.cart.getOrCreateActiveCart(customerId)
    if (!activeCart || Number(activeCart.id) !== Number(expectedCartId)) {
      return {
        ok: false,
        error: {
          message: "Your cart has changed. Please review it and try again.",
          code: "CART_CHANGED",
        },
      }
    }
    await sdk.cart.addItem(activeCart.id, input)
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
      return { ok: false, error: { message: "Authentication required" } }
    }
    const customerId = await resolveActingCustomerId()
    if (customerId == null) return { ok: true, cart: null }
    const cart = await sdk.cart.getOrCreateActiveCart(customerId)
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
  cartItemId: number,
  quantity: number
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: "Authentication required" } }
    }
    await sdk.cart.updateItemQuantity(cartItemId, quantity)
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
  cartItemId: number,
  reference: string
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: "Authentication required" } }
    }
    await sdk.cart.updateItemReference(cartItemId, reference)
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
  cartItemId: number
): Promise<{ ok: true } | { ok: false; error: ActionError }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) {
      return { ok: false, error: { message: "Authentication required" } }
    }
    await sdk.cart.removeItem(cartItemId)
    return { ok: true }
  } catch (error: any) {
    console.error("[removeCartItemAction] Error removing item:", error)
    return {
      ok: false,
      error: toActionError(error, "Failed to remove item"),
    }
  }
}
