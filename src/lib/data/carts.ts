"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import {
  CartSummary,
  FurnisystemsCart,
} from "@lib/furnisystems-sdk/modules/cart/types"
import { getActingCustomer } from "./acting-customer"

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
