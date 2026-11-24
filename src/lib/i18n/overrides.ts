// Admin-edited UI translation overrides.
//
// Source (public REST, no auth, Cache-Control: public, max-age=300):
//   GET {NEXT_PUBLIC_BACKEND_REST_API}/v1/translations/<b2b_common|b2b_account>
//       ?language=<en|fr|de>&overridesOnly=true
//   -> { namespace, language, entries: Record<dottedKey, string> }
// `overridesOnly=true` is ALWAYS sent: an older backend that ignores it would
// return every key resolved with English fallbacks, which must never be
// treated as overrides. Any failure => no overrides ({}); bundled JSON stays
// the complete fallback.
//
// No React / no "server-only": the shared loader (unified-config.ts) imports
// this, but in the browser it goes through /api/i18n-overrides instead and
// never calls fetchTranslationOverrides.

import { isSupportedLanguage } from "./config"
import type { OverridesPayload } from "./overrides-store"
import {
  OVERRIDE_NAMESPACES,
  type OverrideNamespace,
  buildOverrides,
  isOverrideNamespace,
  type JsonObject,
} from "./overrides-core"

export const OVERRIDES_REVALIDATE_SECONDS = 300
export const OVERRIDES_CACHE_TAG = "ui-translations"
const FETCH_TIMEOUT_MS = 3000

async function loadBundled(language: string, namespace: string): Promise<unknown> {
  const mod = await import(`./locales/${language}/${namespace}.json`)
  return mod.default || mod
}

/**
 * Nested, shape-guarded override object for a portal language/namespace.
 * Never throws; returns {} for unknown language/namespace or any failure.
 */
export async function fetchTranslationOverrides(
  language: string,
  namespace: string
): Promise<JsonObject> {
  return (await fetchTranslationOverridesStrict(language, namespace)) ?? {}
}

/**
 * Like fetchTranslationOverrides but distinguishes failure (null) from a
 * genuine "no overrides" ({} from a 200). Used by the server singleton
 * refresh so a failed refresh keeps the previous bundle instead of wiping
 * overrides. Never throws.
 */
export async function fetchTranslationOverridesStrict(
  language: string,
  namespace: string
): Promise<JsonObject | null> {
  const lang = (language || "").toLowerCase()
  if (!isSupportedLanguage(lang) || !isOverrideNamespace(namespace)) return null
  const rest = (process.env.NEXT_PUBLIC_BACKEND_REST_API || "")
    .trim()
    .replace(/\/+$/, "")
  if (!/^https?:\/\/[^/]/i.test(rest)) return null
  try {
    const url =
      `${rest}/v1/translations/${OVERRIDE_NAMESPACES[namespace]}` +
      `?language=${encodeURIComponent(lang)}&overridesOnly=true`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: {
        revalidate: OVERRIDES_REVALIDATE_SECONDS,
        tags: [OVERRIDES_CACHE_TAG],
      },
    })
    if (!res.ok) return null
    const body = (await res.json()) as { entries?: unknown; language?: unknown }
    // Sanity: a response for another language is not "overrides for lang".
    if (
      typeof body?.language === "string" &&
      body.language.toLowerCase() !== lang
    ) {
      return null
    }
    const bundled = await loadBundled(lang, namespace)
    return buildOverrides(body?.entries, bundled)
  } catch {
    return null
  }
}

/**
 * Payload for the server-rendered layout: overrides for BOTH `en` (the
 * server/first client render language) and the URL language, for both
 * namespaces, fetched in parallel (Next data cache dedupes). A failed fetch
 * yields `null` ("unknown": the client keeps what it has), never `{}`.
 */
export async function getOverridesPayload(
  language: string
): Promise<OverridesPayload> {
  const langs = Array.from(
    new Set(["en", (language || "en").toLowerCase()].filter(isSupportedLanguage))
  )
  const namespaces = Object.keys(OVERRIDE_NAMESPACES) as OverrideNamespace[]
  const payload: OverridesPayload = {}
  await Promise.all(
    langs.flatMap((lng) =>
      namespaces.map(async (ns) => {
        const data = await fetchTranslationOverridesStrict(lng, ns)
        ;(payload[lng] ??= {})[ns] = data
      })
    )
  )
  return payload
}
