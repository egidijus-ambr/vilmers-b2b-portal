// Fabric price category labels (FabricPriceCategory.group_number -> display
// name). Served by the backend (public REST, no auth):
//   GET {NEXT_PUBLIC_BACKEND_REST_API}/v1/translations/fabric_price_category?language=<lang>
//   -> { namespace, language, entries: Record<group_number as string, label> }
// fully resolved server-side. The defaults below mirror the backend's
// defaults EXACTLY and are used whenever the endpoint fails or is not yet
// deployed, so the site keeps working.
//
// No React / no "server-only" import: shared by the server fetch, the client
// context (src/lib/context/fabric-category-labels-context.tsx) and the
// pricelist workbook (runnable under plain tsx harnesses). Relative imports
// only, for the same reason.

import { backendLanguageMapping, defaultLanguage } from "./i18n/config"

export type FabricCategoryLabels = Record<string, string>

export const DEFAULT_FABRIC_CATEGORY_LABELS: Readonly<FabricCategoryLabels> = {
  "1": "CAT1",
  "2": "CAT2",
  "3": "CAT3",
  "4": "CAT4",
  "5": "CAT5",
  "11": "Leather A",
  "12": "Leather B",
}

/** Backend default for any group number: known label, else `CAT{n}`. */
export function defaultFabricCategoryLabel(groupNumber: number): string {
  return DEFAULT_FABRIC_CATEGORY_LABELS[String(groupNumber)] ?? `CAT${groupNumber}`
}

/** Label for a group number from a fetched map, falling back to the default. */
export function getFabricCategoryLabel(
  labels: FabricCategoryLabels | null | undefined,
  groupNumber: number | string | null | undefined
): string {
  if (groupNumber === null || groupNumber === undefined) return ""
  const hit = labels?.[String(groupNumber)]
  if (typeof hit === "string" && hit.trim() !== "") return hit
  return defaultFabricCategoryLabel(Number(groupNumber))
}

const FETCH_TIMEOUT_MS = 3000
const REVALIDATE_SECONDS = 300

export interface FabricCategoryLabelsResult {
  /** Always usable: backend entries merged over the defaults. */
  labels: FabricCategoryLabels
  /** True when the endpoint failed and the defaults stand in. */
  degraded: boolean
}

function backendLanguageCode(language: string): string {
  const key = (language || "").toLowerCase()
  return (
    (backendLanguageMapping as Record<string, string>)[key] ??
    backendLanguageMapping[defaultLanguage]
  )
}

/**
 * Server-side fetch (Next data cache, 5 min). Never throws. Reports whether
 * it fell back so callers that cache derived artefacts (pricelist export) can
 * treat a fallback as degraded.
 */
export async function fetchFabricCategoryLabels(
  language: string
): Promise<FabricCategoryLabelsResult> {
  const fallback = {
    labels: { ...DEFAULT_FABRIC_CATEGORY_LABELS },
    degraded: true,
  }
  const rest = (process.env.NEXT_PUBLIC_BACKEND_REST_API || "")
    .trim()
    .replace(/\/+$/, "")
  if (!/^https?:\/\/[^/]/i.test(rest)) return fallback
  try {
    const url =
      `${rest}/v1/translations/fabric_price_category` +
      `?language=${encodeURIComponent(backendLanguageCode(language))}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return fallback
    const body = (await res.json()) as { entries?: unknown }
    const entries = body?.entries
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
      return fallback
    }
    const labels: FabricCategoryLabels = { ...DEFAULT_FABRIC_CATEGORY_LABELS }
    for (const [k, v] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() !== "") labels[k] = v
    }
    return { labels, degraded: false }
  } catch {
    return fallback
  }
}

export async function getFabricCategoryLabels(
  language: string
): Promise<FabricCategoryLabels> {
  return (await fetchFabricCategoryLabels(language)).labels
}
