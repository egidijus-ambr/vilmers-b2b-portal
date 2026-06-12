"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { sdk } from "@lib/config"
import { FurnisystemsCart, FurnisystemsCartItem, AddCartItemInput } from "@lib/furnisystems-sdk/modules/cart/types"
import { renameCartAction, setActiveCartAction, startNewCartAction } from "@lib/data/carts"
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
  const { actingCustomer } = useActingCustomer()
  const [cart, setCart] = useState<FurnisystemsCart | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const customerId = actingCustomer?.id ? Number(actingCustomer.id) : undefined

  const refreshCart = useCallback(async () => {
    if (!customerId) {
      setCart(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const activeCart = await sdk.cart.getOrCreateActiveCart(customerId)
      setCart(activeCart)
    } catch (error) {
      console.error("[CartContext] Failed to fetch cart:", error)
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    if (!customerId) {
      setCart(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    const requestedId = customerId
    setIsLoading(true)
    sdk.cart
      .getOrCreateActiveCart(requestedId)
      .then((next) => {
        if (cancelled) return
        setCart(next)
      })
      .catch((error) => {
        if (cancelled) return
        console.error("[CartContext] Failed to fetch cart:", error)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const addItem = useCallback(async (input: AddCartItemInput) => {
    if (!cart) return
    try {
      await sdk.cart.addItem(cart.id, input)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to add item:", error)
      throw error
    }
  }, [cart, refreshCart])

  const updateItemQuantity = useCallback(async (cartItemId: number, quantity: number) => {
    try {
      await sdk.cart.updateItemQuantity(cartItemId, quantity)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to update quantity:", error)
      throw error
    }
  }, [refreshCart])

  const updateItemReference = useCallback(async (cartItemId: number, reference: string) => {
    try {
      await sdk.cart.updateItemReference(cartItemId, reference)
      await refreshCart()
    } catch (error) {
      console.error("[CartContext] Failed to update reference:", error)
      throw error
    }
  }, [refreshCart])

  const removeItem = useCallback(async (cartItemId: number) => {
    try {
      await sdk.cart.removeItem(cartItemId)
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
        isLoading,
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
