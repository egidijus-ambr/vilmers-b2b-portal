"use client"

import type { ReactNode } from "react"
import i18n from "./client-config"
import { applyOverridesPayload, type OverridesPayload } from "./overrides-store"

/**
 * Applies the server-fetched override payload to the i18next singleton
 * synchronously during render (server render and client first render alike),
 * before any descendant useTranslation consumer renders.
 */
export function I18nOverridesProvider({
  payload,
  children,
}: {
  payload: OverridesPayload
  children: ReactNode
}) {
  applyOverridesPayload(i18n, payload)
  return <>{children}</>
}
