/**
 * The single place `process.env` is read for feature flags.
 *
 * IMPORTANT: Next.js only inlines `process.env.NEXT_PUBLIC_*` reads when the
 * access is a static, literal member expression (e.g.
 * `process.env.NEXT_PUBLIC_FOO`). Dynamic access such as
 * `process.env[someKey]` is NOT inlined by the build, and would silently
 * resolve to `undefined` once this code ends up in a client bundle (many
 * consumers of `features` are `"use client"` components). To stay correct in
 * both server and client bundles, every `NEXT_PUBLIC_*` var this module
 * supports is read here, once, as a static literal — `getBool`/`getString`
 * only ever look values up from the resulting in-memory map, they never touch
 * `process.env` dynamically themselves.
 *
 * Unlike `src/themes/index.ts` (which intentionally throws on an unknown
 * `NEXT_PUBLIC_THEME` to fail the build fast, since the theme is required),
 * flags read here always fall back to their default on missing/invalid
 * input — feature flags are optional and must degrade silently. Only the
 * read-once-at-module-eval pattern is shared with `src/themes/index.ts`, not
 * the throw.
 */

// Read once, at module evaluation, as static literals so Next.js can inline
// each one into whatever bundle (server or client) imports this module.
const publicEnv: Record<string, string | undefined> = {
  NEXT_PUBLIC_FEATURE_ORDER_DETAILS: process.env.NEXT_PUBLIC_FEATURE_ORDER_DETAILS,
  NEXT_PUBLIC_FEATURE_PRODUCT_CATALOG:
    process.env.NEXT_PUBLIC_FEATURE_PRODUCT_CATALOG,
  NEXT_PUBLIC_CONFIGURATOR_PAGE_ENABLED:
    process.env.NEXT_PUBLIC_CONFIGURATOR_PAGE_ENABLED,
  NEXT_PUBLIC_NEWSLETTER_ENABLED: process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED,
  NEXT_PUBLIC_TAWK_ENABLED: process.env.NEXT_PUBLIC_TAWK_ENABLED,
  NEXT_PUBLIC_SHOW_VOLUME: process.env.NEXT_PUBLIC_SHOW_VOLUME,
  NEXT_PUBLIC_SHOW_DELIVERY_SHIPPING_INFORMATION:
    process.env.NEXT_PUBLIC_SHOW_DELIVERY_SHIPPING_INFORMATION,
  NEXT_PUBLIC_SHOW_PVM: process.env.NEXT_PUBLIC_SHOW_PVM,
}

/**
 * Parses a raw env string into a boolean, preserving each flag's current
 * semantics:
 * - Default-OFF flags (`defaultValue === false`) are `true` only when the raw
 *   value is exactly `"true"`.
 * - Default-ON flags (`defaultValue === true`) are `true` unless the raw
 *   value is exactly `"false"`.
 *
 * Any missing/invalid/unexpected input falls back to `defaultValue` — this
 * never throws.
 */
export function parseBool(
  raw: string | undefined,
  defaultValue: boolean
): boolean {
  return defaultValue ? raw !== "false" : raw === "true"
}

/**
 * Boolean flag lookup. `key` must be one of the `NEXT_PUBLIC_*` names
 * captured in `publicEnv` above.
 */
export function getBool(key: string, defaultValue: boolean): boolean {
  return parseBool(publicEnv[key], defaultValue)
}

/**
 * String value lookup, with an optional default when unset.
 */
export function getString(
  key: string,
  defaultValue?: string
): string | undefined {
  return publicEnv[key] ?? defaultValue
}
