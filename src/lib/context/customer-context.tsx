"use client"

import React, { createContext, useContext } from "react"
import { HttpTypes } from "@medusajs/types"

type CustomerContextType = {
  customer:
    | (HttpTypes.StoreCustomer & {
        full_name?: string
        managers?: any[]
        spoken_languages?: string[]
        is_configurator_enabled?: boolean
        is_claims_enabled?: boolean
      })
    | null
}

const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined
)

export function CustomerProvider({
  children,
  customer,
}: {
  children: React.ReactNode
  customer: CustomerContextType["customer"]
}) {
  return (
    <CustomerContext.Provider value={{ customer }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const context = useContext(CustomerContext)
  if (context === undefined) {
    throw new Error("useCustomer must be used within a CustomerProvider")
  }
  return context
}
