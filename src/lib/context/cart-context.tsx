"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { sdk } from "@lib/config"
import { FurnisystemsCart, FurnisystemsCartItem, AddCartItemInput } from "@lib/furnisystems-sdk/modules/cart/types"
import { useCustomer } from "./customer-context"

interface CartContextValue {
  cart: FurnisystemsCart | null
  items: FurnisystemsCartItem[]
  isLoading: boolean
  addItem: (input: AddCartItemInput) => Promise<void>
  updateItemQuantity: (cartItemId: number, quantity: number) => Promise<void>
  updateItemReference: (cartItemId: number, reference: string) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { customer } = useCustomer()
  const [cart, setCart] = useState<FurnisystemsCart | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const customerId = customer?.id ? Number(customer.id) : undefined

  const refreshCart = useCallback(async () => {
    if (!customerId) {
      setCart(null)
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
    refreshCart()
  }, [refreshCart])

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
