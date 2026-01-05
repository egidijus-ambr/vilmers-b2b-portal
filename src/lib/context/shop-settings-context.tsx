"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { ShopSetting } from "@lib/furnisystems-sdk"
import { getShopSettings } from "@lib/data/shop-settings"

type ShopSettingsContextType = {
  shopSettings: ShopSetting | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ShopSettingsContext = createContext<ShopSettingsContextType | undefined>(
  undefined
)

export function ShopSettingsProvider({
  children,
  initialShopSettings,
}: {
  children: React.ReactNode
  initialShopSettings?: ShopSetting | null
}) {
  const [shopSettings, setShopSettings] = useState<ShopSetting | null>(
    initialShopSettings || null
  )
  const [isLoading, setIsLoading] = useState(!initialShopSettings)
  const [error, setError] = useState<string | null>(null)

  const fetchShopSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const settings = await getShopSettings()
      setShopSettings(settings)
    } catch (err) {
      console.error("Error fetching shop settings:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch shop settings"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialShopSettings) {
      fetchShopSettings()
    }
  }, [initialShopSettings])

  const refetch = async () => {
    await fetchShopSettings()
  }

  return (
    <ShopSettingsContext.Provider
      value={{
        shopSettings,
        isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </ShopSettingsContext.Provider>
  )
}

export function useShopSettings() {
  const context = useContext(ShopSettingsContext)
  if (context === undefined) {
    throw new Error(
      "useShopSettings must be used within a ShopSettingsProvider"
    )
  }
  return context
}
