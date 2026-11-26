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
  isLoading: boolean
  addItem: (input: AddCartItemInput) => Promise<void>
  updateItemQuantity: (cartItemId: number, quantity: number) => Promise<void>
  updateItemReference: (cartItemId: number, reference: string) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refreshCart: () => Promise<void>
  saveActiveCart: (name: string) => Promise<{ ok: boolean; error?: string }>
  startNewCart: () => Promise<{ ok: boolean; error?: string }>
  switchActiveCart: (cartId: number) => Promise<{ ok: boolean; error?: string }>
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
  const [isLoading, setIsLoading] = useState(true)

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
        // Never keep showing a cart we could not confirm for this customer.
        setCartState({ ownerId: requestedFor, cart: null })
      } finally {
        if (!isStale()) setIsLoading(false)
      }
    },
    []
  )

  const refreshCart = useCallback(async () => {
    if (!customerId) {
      setCartState({ ownerId: undefined, cart: null })
      setIsLoading(false)
      return
    }
    const requestedFor = customerId
    setIsLoading(true)
    await loadCart(requestedFor, () => customerIdRef.current !== requestedFor)
  }, [customerId, loadCart])

  useEffect(() => {
    setCartState({ ownerId: undefined, cart: null })
    if (!customerId) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    loadCart(customerId, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [customerId, loadCart])

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
    } catch (error) {
      console.error("[CartContext] Failed to add item:", error)
      throw error
    }
  }, [cart, refreshCart, resyncAfterCartChanged, uiLanguage])

  const updateItemQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    try {
      const res = await updateCartItemQuantityAction(cartItemId, quantity)
      if (!res.ok) throw new PaletteActionError(res.error)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to update quantity:", error)
      throw error
    }
  }, [refreshCart])

  const updateItemReference = useCallback(async (cartItemId: number, reference: string) => {
    try {
      const res = await updateCartItemReferenceAction(cartItemId, reference)
      if (!res.ok) throw new PaletteActionError(res.error)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to update reference:", error)
      throw error
    }
  }, [refreshCart])

  const removeItem = useCallback(async (cartItemId: number) => {
    try {
      const res = await removeCartItemAction(cartItemId)
      if (!res.ok) throw new PaletteActionError(res.error)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to remove item:", error)
      throw error
    }
  }, [refreshCart])

  const saveActiveCart = useCallback(async (name: string) => {
    if (!cart) return { ok: false, error: "No active cart" }
    const res = await renameCartAction(cart.id, name)
    if (res.ok) await refreshCart()
    return res
  }, [cart, refreshCart])

  const startNewCart = useCallback(async () => {
    const res = await startNewCartAction()
    if (res.ok) await refreshCart()
    return res
  }, [refreshCart])

  const switchActiveCart = useCallback(async (cartId: number) => {
    const res = await setActiveCartAction(cartId)
    if (res.ok) await refreshCart()
    return res
  }, [refreshCart])

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart?.items ?? [],
        // Still loading while the stored cart belongs to a previous customer.
        isLoading: isLoading || (customerId != null && !cartIsForCurrentCustomer),
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
