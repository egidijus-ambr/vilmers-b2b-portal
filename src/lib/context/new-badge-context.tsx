"use client"

import { createContext, useContext, type ReactNode } from "react"

const NewBadgeContext = createContext<number>(0)

export function NewBadgeProvider({
  days,
  children,
}: {
  days: number
  children: ReactNode
}) {
  return (
    <NewBadgeContext.Provider value={days}>{children}</NewBadgeContext.Provider>
  )
}

/** Number of days an item counts as "new" (0 = badges disabled). */
export function useNewBadgeDays(): number {
  return useContext(NewBadgeContext)
}
