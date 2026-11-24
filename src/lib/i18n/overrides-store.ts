// Process-global (per JS runtime) store of admin override payloads, plus the
// synchronous "apply to the i18next instance" step. No server-only imports:
// used in the browser and in the SSR of client components.
//
// Flow: the (main) layout fetches overrides on the server and passes them as a
// prop to <I18nOverridesProvider>, which calls applyOverridesPayload() in its
// render body - on the server render AND on the client's first render, before
// any consumer below it renders. i18next's backend loader reads this store
// (loadFromStore in unified-config.ts). When a bundle is already loaded in
// the instance, it is REPLACED (bundled + current overrides, so removed
// overrides revert) in the same synchronous tick (remove+add, no await).

import { isSupportedLanguage } from "./config"
import { deepMerge, isOverrideNamespace, type JsonObject } from "./overrides-core"

/** lng -> ns -> overrides; `null` = unknown (fetch failed): keep what we have. */
export type OverridesPayload = Partial<
  Record<string, Partial<Record<string, JsonObject | null>>>
>

interface InstanceLike {
  hasResourceBundle(lng: string, ns: string): boolean
  removeResourceBundle(lng: string, ns: string): unknown
  addResourceBundle(
    lng: string,
    ns: string,
    resources: unknown,
    deep?: boolean,
    overwrite?: boolean
  ): unknown
}

const key = (lng: string, ns: string) => `${lng}/${ns}`
const EMPTY_JSON = "{}"

const store = new Map<string, { json: string; data: JsonObject }>()
const bundledCache = new Map<string, unknown>()

export const getStoredOverrides = (lng: string, ns: string): JsonObject =>
  store.get(key(lng, ns))?.data ?? {}

/** Called by the loader so a later payload can rebuild bundled+overrides sync. */
export const rememberBundled = (lng: string, ns: string, bundled: unknown) => {
  bundledCache.set(key(lng, ns), bundled)
}

/** Test helper. */
export const resetOverridesStore = () => {
  store.clear()
  bundledCache.clear()
}

/**
 * Idempotent and cheap when nothing changed (JSON string compare, no instance
 * access). Never throws. Safe under React strict-mode double render.
 */
export function applyOverridesPayload(
  instance: InstanceLike,
  payload: OverridesPayload | null | undefined
): void {
  try {
    if (!payload || typeof payload !== "object") return
    for (const [lng, byNs] of Object.entries(payload)) {
      if (!isSupportedLanguage(lng) || !byNs || typeof byNs !== "object") continue
      for (const [ns, data] of Object.entries(byNs)) {
        if (!isOverrideNamespace(ns)) continue
        if (data === null || data === undefined) continue // unknown: keep previous
        if (typeof data !== "object" || Array.isArray(data)) continue
        const json = JSON.stringify(data)
        const prevJson = store.get(key(lng, ns))?.json ?? EMPTY_JSON
        if (json === prevJson) continue
        store.set(key(lng, ns), { json, data })
        const bundled = bundledCache.get(key(lng, ns))
        if (bundled && instance.hasResourceBundle(lng, ns)) {
          const merged = deepMerge(bundled, data) ?? bundled
          // Same tick, no await: nobody can observe an empty bundle.
          instance.removeResourceBundle(lng, ns)
          instance.addResourceBundle(lng, ns, merged, false, true)
        }
      }
    }
  } catch {
    // never throw into rendering
  }
}
