"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCustomer } from "./customer-context"
import { isAgentOrAdmin as roleIsAgentOrAdmin } from "@lib/util/roles"
import {
  setActingCustomerCookie,
  clearActingCustomerCookie,
} from "@lib/util/acting-customer-cookie"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"
import { getActingCustomerForSelector } from "@lib/data/customer-search"

type ActingCustomer =
  | SearchCustomerResult
  | { id: number | string; role?: string | null; price_listId?: number | null }
  | null

type ActingCustomerContextValue = {
  actingCustomer: ActingCustomer
  setActingCustomer: (
    c: SearchCustomerResult | null,
    options?: { redirect?: boolean }
  ) => void
  clearActingCustomer: () => void
  /**
   * Re-read the acting customer from the server (cookie) without writing the
   * cookie or navigating, e.g. after it changed in another tab. Resolves to
   * the resynced customer id (null = none), or undefined if it could not be
   * read / does not apply (end-customers).
   */
  resyncActingCustomer: () => Promise<number | null | undefined>
  isAgentOrAdmin: boolean
  isImpersonatedByManager: boolean
}

const ActingCustomerContext =
  createContext<ActingCustomerContextValue | null>(null)

type ProviderProps = {
  initialActingCustomer: ActingCustomer
  isImpersonatedByManager?: boolean
  /** Language-prefixed URL to land on after a customer is picked. */
  landingHref?: string | null
  children: ReactNode
}

export function ActingCustomerProvider({
  initialActingCustomer,
  isImpersonatedByManager = false,
  landingHref = null,
  children,
}: ProviderProps) {
  const { customer } = useCustomer()
  const router = useRouter()
  const pathname = usePathname()
  const isAgentOrAdmin = roleIsAgentOrAdmin(customer)

  // For non-agent/admin, the acting customer is always the logged-in customer.
  // For agent/admin, we maintain selectable state seeded from the server-side initial value.
  const [acting, setActing] = useState<ActingCustomer>(
    isAgentOrAdmin ? initialActingCustomer : (customer as ActingCustomer)
  )

  const setActingCustomer = useCallback(
    (c: SearchCustomerResult | null, options?: { redirect?: boolean }) => {
      if (!isAgentOrAdmin) return // no-op for end-customers
      if (c) {
        setActingCustomerCookie(typeof c.id === "string" ? Number(c.id) : c.id)
      } else {
        clearActingCustomerCookie()
      }
      setActing(c as ActingCustomer)
      if (c) {
        // Hydrate the picked row: on REST v1 the selector row is slim (no
        // files, palettes, tags, price lists), so read the full acting
        // customer back from the server (same resolver as the layout). Only
        // applied while the same customer is still selected.
        const pickedId = String(c.id)
        void getActingCustomerForSelector()
          .then((res) => {
            if (!res.ok || !res.customer || String(res.customer.id) !== pickedId) return
            setActing((prev) =>
              prev && String(prev.id) === pickedId
                ? (res.customer as ActingCustomer)
                : prev
            )
          })
          .catch(() => undefined)
      }

      // Picking (not clearing) a customer lands on the first Store category,
      // unless the caller opts out (checkout must stay put).
      const shouldRedirect = c && landingHref && options?.redirect !== false
      if (shouldRedirect && pathname !== landingHref) {
        router.push(landingHref)
      }
      // Always refresh: the new cookie must be reflected by the server
      // render (filtered listings), not by a cached RSC payload.
      router.refresh()
    },
    [isAgentOrAdmin, router, pathname, landingHref]
  )

  const clearActingCustomer = useCallback(() => {
    setActingCustomer(null)
  }, [setActingCustomer])

  const resyncActingCustomer = useCallback(async () => {
    if (!isAgentOrAdmin) return undefined
    const res = await getActingCustomerForSelector()
    if (!res.ok) return undefined
    setActing((prev) => {
      // Keep the current object when the id is unchanged (no needless re-renders).
      if (prev && res.customer && String(prev.id) === String(res.customer.id)) return prev
      return res.customer as ActingCustomer
    })
    return res.customer ? Number(res.customer.id) : null
  }, [isAgentOrAdmin])

  const value: ActingCustomerContextValue = {
    actingCustomer: isAgentOrAdmin ? acting : (customer as ActingCustomer),
    setActingCustomer,
    clearActingCustomer,
    resyncActingCustomer,
    isAgentOrAdmin,
    isImpersonatedByManager,
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
