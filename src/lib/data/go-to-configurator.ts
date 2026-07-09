// src/lib/data/go-to-configurator.ts
import { cookies } from "next/headers"
import { canShowAllProductsToggle } from "@lib/data/show-all-products"
import { GO_TO_CONFIGURATOR_COOKIE } from "@lib/util/go-to-configurator-cookie"
import { features } from "@lib/features"

/**
 * Reads the goToConfigurator cookie. Returns true iff the cookie value is "1".
 * Server-only. Does NOT enforce the privilege gate — call canShowAllProductsToggle for that.
 */
export async function getGoToConfiguratorCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(GO_TO_CONFIGURATOR_COOKIE)?.value === "1"
}

/**
 * True iff the configurator feature is enabled, the gate passes, AND the cookie is set.
 * Returns false immediately if features.configurator is false.
 */
export async function getGoToConfiguratorActive(): Promise<boolean> {
  if (!features.configurator) return false
  const [allowed, on] = await Promise.all([
    canShowAllProductsToggle(),
    getGoToConfiguratorCookie(),
  ])
  return allowed && on
}
