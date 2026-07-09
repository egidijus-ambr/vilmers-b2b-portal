import { getBool } from "@lib/env"

/**
 * Centralized, typed feature flags — the single source of truth for the
 * `NEXT_PUBLIC_FEATURE_*` / `NEXT_PUBLIC_SHOW_*` / `NEXT_PUBLIC_*_ENABLED`
 * toggles previously read ad hoc via
 * `process.env.NEXT_PUBLIC_X === "true"` (or `!== "false"`) scattered across
 * the codebase. Each flag preserves its pre-existing default; see the Layer 2
 * table in
 * `docs/superpowers/specs/2026-07-08-theming-and-feature-config-design.md`.
 *
 * Client-safe: every input is a `NEXT_PUBLIC_*` var, inlined at `next build`.
 * Build-time only — changing a flag requires a rebuild (same model as
 * `src/themes`).
 */
export const features = {
  orderDetails: getBool("NEXT_PUBLIC_FEATURE_ORDER_DETAILS", false),
  productCatalog: getBool("NEXT_PUBLIC_FEATURE_PRODUCT_CATALOG", false),
  configurator: getBool("NEXT_PUBLIC_CONFIGURATOR_PAGE_ENABLED", false),
  newsletter: getBool("NEXT_PUBLIC_NEWSLETTER_ENABLED", false),
  tawk: getBool("NEXT_PUBLIC_TAWK_ENABLED", true),
  showVolume: getBool("NEXT_PUBLIC_SHOW_VOLUME", false),
  showDeliveryShippingInfo: getBool(
    "NEXT_PUBLIC_SHOW_DELIVERY_SHIPPING_INFORMATION",
    false
  ),
  showPvm: getBool("NEXT_PUBLIC_SHOW_PVM", false),
} as const

export type Features = typeof features
