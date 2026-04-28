"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { useCustomer } from "./customer-context"
import { isAgentOrAdmin as roleIsAgentOrAdmin } from "@lib/util/roles"
import {
  setActingCustomerCookie,
  clearActingCustomerCookie,
} from "@lib/util/acting-customer-cookie"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"

type ActingCustomer =
  | SearchCustomerResult
  | { id: number | string; role?: string | null; price_listId?: number | null }
  | null

type ActingCustomerContextValue = {
  actingCustomer: ActingCustomer
  setActingCustomer: (c: SearchCustomerResult | null) => void
  clearActingCustomer: () => void
  isAgentOrAdmin: boolean
}

const ActingCustomerContext =
  createContext<ActingCustomerContextValue | null>(null)

type ProviderProps = {
  initialActingCustomer: ActingCustomer
  children: ReactNode
}

export function ActingCustomerProvider({
  initialActingCustomer,
  children,
}: ProviderProps) {
  const { customer } = useCustomer()
  const router = useRouter()
  const isAgentOrAdmin = roleIsAgentOrAdmin(customer)

  // For non-agent/admin, the acting customer is always the logged-in customer.
  // For agent/admin, we maintain selectable state seeded from the server-side initial value.
  const [acting, setActing] = useState<ActingCustomer>(
    isAgentOrAdmin ? initialActingCustomer : (customer as ActingCustomer)
  )

  const setActingCustomer = useCallback(
    (c: SearchCustomerResult | null) => {
      if (!isAgentOrAdmin) return // no-op for end-customers
      if (c) {
        setActingCustomerCookie(typeof c.id === "string" ? Number(c.id) : c.id)
      } else {
        clearActingCustomerCookie()
      }
      setActing(c as ActingCustomer)
      router.refresh()
    },
    [isAgentOrAdmin, router]
  )

  const clearActingCustomer = useCallback(() => {
    setActingCustomer(null)
  }, [setActingCustomer])

  const value: ActingCustomerContextValue = {
    actingCustomer: isAgentOrAdmin ? acting : (customer as ActingCustomer),
    setActingCustomer,
    clearActingCustomer,
    isAgentOrAdmin,
  }

  return (
    <ActingCustomerContext.Provider value={value}>
      {children}
    </ActingCustomerContext.Provider>
  )
}

export function useActingCustomer(): ActingCustomerContextValue {
  const ctx = useContext(ActingCustomerContext)
  if (!ctx)
    throw new Error(
      "useActingCustomer must be used inside ActingCustomerProvider"
    )
  return ctx
}
