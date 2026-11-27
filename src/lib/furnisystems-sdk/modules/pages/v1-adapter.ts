/**
 * REST v1 taxonomy / CMS / settings DTOs -> the portal's existing types, and
 * the pure decisions around them (portal REST migration slices 4 and 5).
 *
 * The backend serves these documents in the GraphQL selections' OWN
 * snake_case keys (furnisystems-backend src/dto/cms.dto.ts: "the v1 body is
 * a drop-in for the GraphQL answer"), so the mappers are pass-throughs with
 * the documented differences:
 *   - content blocks carry no `grid_product_containers` (v1 grids are read
 *     by block id: GET /catalog/content-blocks/{id}/products);
 *   - a content block's `config` has no server-side keys (notify_email);
 *   - link targets to pages the caller may not see are null (guests);
 *   - CmsPage has extra keys (`private` = the inherited flag, `chromeless`,
 *     `parentId`, `ancestors`) on every lookup, not only by-path;
 *   - enabled_languages carry only id / language / default_language /
 *     web_address (the tracking ids, switcher and multiplier columns the
 *     GraphQL document selected are not read anywhere in the portal);
 *   - PublicShopSettings also carries new_badge_days, the pricelist switches
 *     and fabric_low_stock_threshold (one read replaces four).
 *
 * Pure, relative imports only (scripts/verify-cms-v1.ts).
 */
import type { CategoryData } from "../categories/types"
import type { CollectionData } from "../collections/types"
import type { ShopSetting } from "../shop-settings/types"
import type { Page, PageResult, PrivatePageResult } from "./types"

// ---- page lookups ----------------------------------------------------------

export const V1_PRIVATE_PAGE_CODE = "PRIVATE_PAGE"

/** The sentinel the GraphQL path returns for a private page (pages/index.ts). */
export const PRIVATE_PAGE_RESULT_V1: PrivatePageResult = {
  private: true,
  restricted: true,
}

/**
 * What a failed v1 CMS page lookup means for the caller:
 *   private   401 PRIVATE_PAGE (a guest asked for a private page): the
 *             page component redirects to login with returnTo, exactly as
 *             for the GraphQL PRIVATE_PAGE error
 *   not-found 404: the normal not-found page
 *   fallback  any OTHER 401 (the bearer was not usable): GraphQL for this
 *             call (./v1-transport-rule.ts)
 *   error     403 / 429 / 5xx / network (status 0) / anything else:
 *             fail closed (no page); NOT cached
 */
export type V1PageLookupOutcome = "private" | "not-found" | "fallback" | "error"

export function classifyV1PageError(
  status: number,
  code: string | null | undefined
): V1PageLookupOutcome {
  if (status === 401) return code === V1_PRIVATE_PAGE_CODE ? "private" : "fallback"
  if (status === 404) return "not-found"
  return "error"
}

/** Outcome -> the value getPageByPath returns (`undefined` = take the fallback / throw). */
export function pageResultForOutcome(
  outcome: V1PageLookupOutcome
): PageResult | null | undefined {
  if (outcome === "private") return PRIVATE_PAGE_RESULT_V1
  if (outcome === "not-found") return null
  return undefined
}

// ---- documents -------------------------------------------------------------

/** CmsPage -> Page (drop-in). */
export function mapV1CmsPage(v1: unknown): Page {
  return v1 as Page
}

export function mapV1Category(v1: unknown): CategoryData {
  return v1 as CategoryData
}

export function mapV1CategoryList(v1: { data?: unknown[] } | null | undefined): CategoryData[] {
  return (v1?.data ?? []) as CategoryData[]
}

export function mapV1Collection(v1: unknown): CollectionData {
  return v1 as CollectionData
}

export function mapV1ListData<T>(v1: { data?: unknown[] } | null | undefined): T[] {
  return (v1?.data ?? []) as T[]
}

// ---- shop settings ---------------------------------------------------------

/** GET /catalog/shop-settings (the extra, non-GraphQL-document keys). */
export interface V1PublicShopSettings extends Record<string, unknown> {
  new_badge_days?: number | null
  pricelist_export_enabled?: boolean | null
  pricelist_cover_enabled?: boolean | null
  pricelist_cover_terms?: string | null
  pricelist_cover_component_group_ids?: number[] | null
  pricelist_cover_image?: { id?: number; src?: string | null } | null
  default_manufacturer?: {
    id?: number
    company_name?: string | null
    logo_image?: { id?: number; src?: string | null } | null
  } | null
  fabric_low_stock_threshold?: number | null
}

export function mapV1ShopSettings(v1: V1PublicShopSettings): ShopSetting {
  return v1 as unknown as ShopSetting
}

/** new_badge_days: a positive number, else 0 (disabled), as new-badge-days.ts. */
export function newBadgeDaysOf(v1: V1PublicShopSettings | null | undefined): number {
  const days = v1?.new_badge_days
  return typeof days === "number" && Number.isFinite(days) && days > 0 ? days : 0
}

export const LOW_STOCK_THRESHOLD_DEFAULT = 50

/** fabric_low_stock_threshold (the server already applied the default of 50). */
export function lowStockThresholdOf(v1: V1PublicShopSettings | null | undefined): number {
  const t = v1?.fabric_low_stock_threshold
  return typeof t === "number" && Number.isFinite(t) ? t : LOW_STOCK_THRESHOLD_DEFAULT
}

/** Same shape as lib/data/pricelist-settings.ts PricelistSettings. */
export interface V1PricelistSettings {
  exportEnabled: boolean
  coverEnabled: boolean
  coverImageUrl: string | null
  coverTerms: string
  coverComponentGroupIds: number[]
  logoUrl: string
}

export function pricelistSettingsOf(
  v1: V1PublicShopSettings | null | undefined,
  fallbackLogoUrl: string
): V1PricelistSettings {
  return {
    exportEnabled: v1?.pricelist_export_enabled === true,
    coverEnabled: v1?.pricelist_cover_enabled === true,
    coverImageUrl: v1?.pricelist_cover_image?.src?.trim() || null,
    coverTerms: (v1?.pricelist_cover_terms ?? "").trim(),
    coverComponentGroupIds: v1?.pricelist_cover_component_group_ids ?? [],
    logoUrl: v1?.default_manufacturer?.logo_image?.src?.trim() || fallbackLogoUrl,
  }
}

// ---- public forms ----------------------------------------------------------

export interface V1FormError {
  status: number
  code?: string | null
  errors?: { path: string; message: string }[]
}

export type EmailSignupErrorCode = "invalid-email" | "generic" | "later"

/**
 * POST /public/email-signup failure -> the existing client error codes
 * (content-block/index.tsx switches on exactly these):
 *   400 on body.email                -> invalid-email
 *   400 otherwise / 404 / 422 / 403  -> generic
 *   429 (rate limited) / 503 / 5xx / network (0) -> later ("try again later")
 * A 401 never reaches this (re-routed to GraphQL by the caller).
 */
export function emailSignupErrorCode(e: V1FormError): EmailSignupErrorCode {
  if (e.status === 400) {
    return (e.errors ?? []).some((x) => x.path === "body.email" || x.path === "email")
      ? "invalid-email"
      : "generic"
  }
  if (e.status === 429 || e.status === 0 || e.status >= 500) return "later"
  return "generic"
}

export type PartnerErrorCode = "failed" | "error"

/** Fields the become-partner form can mark (it renders "field-required"). */
const PARTNER_FIELD_KEYS = ["companyName", "contactEmail"] as const

/**
 * POST /public/partner-request failure ->
 *   400 with field errors on companyName / contactEmail -> fieldErrors
 *        (the form shows its "field-required" text under those inputs)
 *   400 on any other field / 403 / 404 / 422          -> failed
 *   429 / 503 / 5xx / network                         -> error ("try again later")
 */
export function partnerRequestError(e: V1FormError): {
  errorCode?: PartnerErrorCode
  fieldErrors?: Record<string, string>
} {
  if (e.status === 400) {
    const fieldErrors: Record<string, string> = {}
    let other = false
    for (const x of e.errors ?? []) {
      const key = x.path.replace(/^body\./, "")
      if ((PARTNER_FIELD_KEYS as readonly string[]).includes(key)) {
        fieldErrors[key] = "invalid"
      } else {
        other = true
      }
    }
    if (Object.keys(fieldErrors).length > 0 && !other) return { fieldErrors }
    return { errorCode: "failed" }
  }
  if (e.status === 429 || e.status === 0 || e.status >= 500) return { errorCode: "error" }
  return { errorCode: "failed" }
}

/**
 * The partner-request body: only the declared keys, trimmed, empty /
 * missing ones OMITTED (the v1 schema is strict and `.optional()` rejects
 * null). No recipient is ever sent.
 */
export function partnerRequestBody(input: Record<string, unknown>): Record<string, string> {
  const keys = [
    "companyName",
    "companyCode",
    "vatCode",
    "country",
    "expectedTurnover",
    "message",
    "contactEmail",
  ]
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = input[k]
    if (typeof v !== "string") continue
    const t = k === "message" ? v : v.trim()
    if (t.trim() === "") continue
    out[k] = t
  }
  return out
}
