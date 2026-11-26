"use client"

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { FurnisystemsCart, FurnisystemsCartItem, AddCartItemInput } from "@lib/furnisystems-sdk/modules/cart/types"
import { addCartItemAction, getActiveCartAction, removeCartItemAction, updateCartItemQuantityAction, updateCartItemReferenceAction, renameCartAction, setActiveCartAction, startNewCartAction } from "@lib/data/carts"
import { CART_CHANGED, PaletteActionError } from "@lib/fabric-palettes/palette-error"
import { useParams, useRouter } from "next/navigation"
import { useActingCustomer } from "./acting-customer-context"

interface CartContextValue {
  cart: FurnisystemsCart | null
  items: FurnisystemsCartItem[]
  /**
   * True only while there is no confirmed cart for the current acting
   * customer: the first fetch, or the refetch after the acting customer
   * changed. A background refresh (after a mutation) never sets it — render
   * a skeleton for this state.
   */
  isLoading: boolean
  /**
   * True while a cart mutation and the refresh that follows it are in
   * flight. Existing items stay rendered; render a busy overlay and disable
   * every cart action. Only one mutation runs at a time (see runExclusive).
   */
  isMutating: boolean
  addItem: (input: AddCartItemInput) => Promise<void>
  updateItemQuantity: (cartItemId: number, quantity: number) => Promise<void>
  updateItemReference: (cartItemId: number, reference: string) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refreshCart: () => Promise<void>
  saveActiveCart: (name: string) => Promise<{ ok: boolean; error?: string }>
  startNewCart: () => Promise<{ ok: boolean; error?: string }>
  switchActiveCart: (cartId: number) => Promise<{ ok: boolean; error?: string }>
}

/** Thrown when a cart mutation is attempted while another is in flight. */
export class CartBusyError extends Error {
  constructor() {
    super("Cart is busy")
    this.name = "CartBusyError"
  }
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { actingCustomer, resyncActingCustomer } = useActingCustomer()
  const router = useRouter()
  const routeParams = useParams()
  const uiLanguage = (routeParams?.languageCode as string | undefined)?.toLowerCase()
  // The cart is stored together with the acting customer it was fetched for.
  // `cart` is derived synchronously during render, so the moment the acting
  // customer changes the previous customer's cart is no longer exposed (and
  // add/save cannot target its id), even before the refetch resolves.
  const [cartState, setCartState] = useState<{
    ownerId: number | undefined
    cart: FurnisystemsCart | null
  }>({ ownerId: undefined, cart: null })
  // Number of in-flight mutations. The ref is the lock (synchronous, so two
  // clicks in the same frame cannot both pass); the state mirrors it for
  // rendering.
  const mutationLockRef = useRef(0)
  const [pendingMutations, setPendingMutations] = useState(0)

  const customerId = actingCustomer?.id ? Number(actingCustomer.id) : undefined
  const cartIsForCurrentCustomer =
    customerId != null && cartState.ownerId === customerId
  const cart = cartIsForCurrentCustomer ? cartState.cart : null

  // Latest acting customer, read by async fetches to drop responses that
  // arrive after the acting customer changed.
  const customerIdRef = useRef(customerId)
  useEffect(() => {
    customerIdRef.current = customerId
  }, [customerId])

  const loadCart = useCallback(
    async (requestedFor: number, isStale: () => boolean) => {
      try {
        const res = await getActiveCartAction()
        if (!res.ok) throw new PaletteActionError(res.error)
        if (isStale()) return
        // The server resolves the customer from the cookie; never label a cart
        // belonging to someone else as this customer's.
        if (res.cart && Number(res.cart.customerId) !== requestedFor) {
          console.error(
            "[CartContext] Active cart belongs to a different customer; ignoring",
            { expected: requestedFor, got: res.cart.customerId }
          )
          setCartState({ ownerId: requestedFor, cart: null })
          return
        }
        // {ok:true, cart:null} = server resolved no acting customer: empty cart.
        setCartState({ ownerId: requestedFor, cart: res.cart ?? null })
      } catch (error) {
        if (isStale()) return
        console.error("[CartContext] Failed to fetch cart:", error)
        // A failed background refresh keeps the cart already confirmed for
        // this same customer (so the list does not blank out); a cart we never
        // confirmed for this customer is never shown.
        setCartState((prev) =>
          prev.ownerId === requestedFor ? prev : { ownerId: requestedFor, cart: null }
        )
      }
    },
    []
  )

  // Background refresh: replaces the cart in place once the response arrives
  // and never flips `isLoading`, so the current items stay rendered.
  const refreshCart = useCallback(async () => {
    if (!customerId) {
      setCartState({ ownerId: undefined, cart: null })
      return
    }
    const requestedFor = customerId
    await loadCart(requestedFor, () => customerIdRef.current !== requestedFor)
  }, [customerId, loadCart])

  useEffect(() => {
    // Drop the previous customer's cart: until this fetch resolves `cart` is
    // null and `isLoading` is true (derived from ownerId below).
    setCartState({ ownerId: undefined, cart: null })
    if (!customerId) return
    let cancelled = false
    loadCart(customerId, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [customerId, loadCart])

  /**
   * Runs one cart mutation (plus its refresh) under the cart-wide busy lock.
   * Rejects immediately with CartBusyError while another one is in flight, so
   * a double click or a second control can never submit concurrently. Must
   * not be nested: refreshCart / resyncAfterCartChanged deliberately do not
   * take the lock.
   */
  const runExclusive = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (mutationLockRef.current > 0) throw new CartBusyError()
    mutationLockRef.current += 1
    setPendingMutations((n) => n + 1)
    try {
      return await fn()
    } finally {
      mutationLockRef.current -= 1
      setPendingMutations((n) => n - 1)
    }
  }, [])

  const resyncAfterCartChanged = useCallback(async () => {
    try {
      const nextId = await resyncActingCustomer()
      // Same customer (or end-customer / unreadable): only the active cart
      // changed, and the [customerId] effect will not re-fire, so reload it.
      // A different customer reloads via that effect; the stale closure here
      // would only race it.
      if (nextId === undefined || nextId === customerId) await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to resync after cart change:", error)
    } finally {
      // Server-rendered data (customer-filtered listings, prices) still
      // reflects the previous customer.
      router.refresh()
    }
  }, [resyncActingCustomer, customerId, refreshCart, router])

  const addItem = useCallback(async (input: AddCartItemInput) => {
    if (!cart) throw new Error("No active cart")
    try {
      await runExclusive(async () => {
        const res = await addCartItemAction(cart.id, {
          ...input,
          language: input.language ?? uiLanguage,
        })
        if (!res.ok) {
          // Server-resolved active cart differs from ours (acting customer or
          // active cart changed in another tab): resync this tab with the
          // server, then fail. The add is NOT retried.
          if (res.error.code === CART_CHANGED) await resyncAfterCartChanged()
          throw new PaletteActionError(res.error)
        }
        await refreshCart()
      })
    } catch (error) {
      console.error("[CartContext] Failed to add item:", error)
      throw error
    }
  }, [cart, refreshCart, resyncAfterCartChanged, uiLanguage, runExclusive])

  const updateItemQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    try {
      await runExclusive(async () => {
        const res = await updateCartItemQuantityAction(cartItemId, quantity)
        if (!res.ok) throw new PaletteActionError(res.error)
        await refreshCart()
      })
    } catch (error) {
      console.error("[CartContext] Failed to update quantity:", error)
      throw error
    }
  }, [refreshCart, runExclusive])

  const updateItemReference = useCallback(async (cartItemId: number, reference: string) => {
    try {
      await runExclusive(async () => {
        const res = await updateCartItemReferenceAction(cartItemId, reference)
        if (!res.ok) throw new PaletteActionError(res.error)
        await refreshCart()
      })
    } catch (error) {
      console.error("[CartContext] Failed to update reference:", error)
      throw error
    }
  }, [refreshCart, runExclusive])

  const removeItem = useCallback(async (cartItemId: number) => {
    try {
      await runExclusive(async () => {
        const res = await removeCartItemAction(cartItemId)
        if (!res.ok) throw new PaletteActionError(res.error)
        await refreshCart()
      })
    } catch (error) {
      console.error("[CartContext] Failed to remove item:", error)
      throw error
    }
  }, [refreshCart, runExclusive])

  // These report failures as {ok:false}; a busy cart is reported the same way.
  const runExclusiveResult = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      try {
        return await runExclusive(fn)
      } catch (error) {
        if (error instanceof CartBusyError) return { ok: false, error: error.message }
        throw error
      }
    },
    [runExclusive]
  )

  const saveActiveCart = useCallback(async (name: string) => {
    if (!cart) return { ok: false, error: "No active cart" }
    const cartId = cart.id
    return runExclusiveResult(async () => {
      const res = await renameCartAction(cartId, name)
      if (res.ok) await refreshCart()
      return res
    })
  }, [cart, refreshCart, runExclusiveResult])

  const startNewCart = useCallback(async () => {
    return runExclusiveResult(async () => {
      const res = await startNewCartAction()
      if (res.ok) await refreshCart()
      return res
    })
  }, [refreshCart, runExclusiveResult])

  const switchActiveCart = useCallback(async (cartId: number) => {
    return runExclusiveResult(async () => {
      const res = await setActiveCartAction(cartId)
      if (res.ok) await refreshCart()
      return res
    })
  }, [refreshCart, runExclusiveResult])

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items ?? [],
        // No confirmed cart for the current acting customer yet (first fetch,
        // or the stored cart belongs to a previous customer).
        isLoading: customerId != null && !cartIsForCurrentCustomer,
        isMutating: pendingMutations > 0,
        addItem,
        updateItemQuantity,
        updateItemReference,
        removeItem,
        refreshCart,
        saveActiveCart,
        startNewCart,
        switchActiveCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
