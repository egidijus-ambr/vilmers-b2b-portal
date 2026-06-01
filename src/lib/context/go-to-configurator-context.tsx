"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { setGoToConfiguratorCookie } from "@lib/util/go-to-configurator-cookie"

type GoToConfiguratorContextValue = {
  enabled: boolean
  setEnabled: (next: boolean) => void
}

const GoToConfiguratorContext =
  createContext<GoToConfiguratorContextValue | undefined>(undefined)

export function GoToConfiguratorProvider({
  initialActive,
  children,
}: {
  initialActive: boolean
  children: ReactNode
}) {
  const [enabled, setEnabledState] = useState(initialActive)

  const setEnabled = (next: boolean) => {
    setGoToConfiguratorCookie(next)
    setEnabledState(next)
  }

  return (
    <GoToConfiguratorContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </GoToConfiguratorContext.Provider>
  )
}

export function useGoToConfigurator(): GoToConfiguratorContextValue {
  const ctx = useContext(GoToConfiguratorContext)
  if (ctx === undefined) {
    return { enabled: false, setEnabled: () => {} }
  }
  return ctx
}
