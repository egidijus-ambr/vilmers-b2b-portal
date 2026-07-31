import type {
  LinkPageAncestor,
  NavLinkTargetFields,
} from "@lib/furnisystems-sdk/modules/shop-settings/types"

/**
 * Shape of an internal `link_page` / `cta_link_page` reference as selected by
 * the CMS GraphQL queries: page_profiles (per-language slug) plus the flat,
 * root-first `ancestors` chain used to build the full nested path.
 *
 * Kept intentionally loose (structural) so it accepts `LinkPage` (button
 * block), `GridPage` (page grid), and `cta_link_page` shapes without casting.
 */
export interface LinkPageLike {
  page_profiles: { slug: string; language: string }[]
  ancestors?: LinkPageAncestor[] | null
}

/**
 * Build a full href for a link_page using the flat root-first `ancestors`
 * array from the backend. Falls back gracefully when `ancestors` is absent
 * (e.g. pages fetched via FIND_PAGE_BY_CODE which does not select
 * `ancestors`).
 *
 * Pure and hook-free — safe to call from server components.
 */
export function buildLinkPageHref(
  page: LinkPageLike,
  languageCode: string
): string | null {
  const ancestorChain: LinkPageAncestor[] = page.ancestors ?? []

  const segments: string[] = []

  for (const ancestor of ancestorChain) {
    const profile =
      ancestor.page_profiles.find(
        (pp) => pp.language.toLowerCase() === languageCode.toLowerCase()
      ) ?? ancestor.page_profiles[0]
    if (profile?.slug) {
      segments.push(profile.slug)
    }
  }

  const pageProfile =
    page.page_profiles.find(
      (pp) => pp.language.toLowerCase() === languageCode.toLowerCase()
    ) ?? page.page_profiles[0]

  if (!pageProfile?.slug) return null
  segments.push(pageProfile.slug)

  return `/${languageCode}/${segments.join("/")}`
}

/**
 * Shape of a CTA-bearing reference (Page hero CTA / ContentBlock CTA) as
 * selected by the CMS GraphQL queries: the `cta_link_type` discriminator
 * plus the two mutually-exclusive internal targets it can point at
 * (`cta_link_page` for CMS pages, `cta_link_category` for categories).
 * `cta_link_type` is optional/nullable to tolerate CTAs authored before this
 * field existed (see the legacy fallback in `resolveCtaHref` below).
 */
export interface CtaLike {
  cta_link_type?: "cms_page" | "category" | "store" | "collection" | null
  cta_link_page?: LinkPageLike | null
  cta_link_category?: {
    category_profiles?:
      | {
          language: string
          meta_information?: { permalink?: string | null } | null
        }[]
      | null
  } | null
  cta_link_collection?: {
    collection_profiles?:
      | {
          language: string
          meta_information?: { permalink?: string | null } | null
        }[]
      | null
  } | null
  /**
   * External URL escape hatch — set only when `cta_link_type` is null (see
   * the backend's `linkTargetScalarWrite`: exactly one of the internal FKs or
   * this is populated). Existing ContentBlock/Page callers never populate
   * this field on the object they pass in, so it's inert for them.
   */
  external_url?: string | null
}

/**
 * Adapts a nav/footer link-target row (`link_type`/`link_page`/…) to
 * `resolveCtaHref`'s `CtaLike` shape. Shared by the DB-driven nav
 * (`navigation-db.ts`) and footer (`footer/index.tsx`), which both consume
 * `NavLinkTargetFields` rows (NavigationItem/NavigationItemLink/FooterLink)
 * but have no CtaLike-shaped type of their own.
 */
export function toCtaLike(target: NavLinkTargetFields): CtaLike {
  return {
    cta_link_type: target.link_type,
    cta_link_page: target.link_page,
    cta_link_category: target.link_category,
    cta_link_collection: target.link_collection,
    external_url: target.external_url,
  }
}

/**
 * Resolve a CTA's href from its typed target (`cta_link_type`): `store` goes
 * to the all-products page, `category` goes to the category's localized
 * permalink, `cms_page` reuses `buildLinkPageHref`. Falls back to treating
 * the CTA as a `cms_page` link when `cta_link_type` is absent but
 * `cta_link_page` is present, so CTAs authored before this discriminator
 * existed keep resolving exactly as before.
 *
 * Pure and hook-free — safe to call from server components.
 */
export function resolveCtaHref(
  cta: CtaLike,
  languageCode: string
): string | null {
  // An explicit external target (link_type === null + external_url) takes
  // priority over the legacy cms_page fallback below, so external nav/footer
  // links (which never carry cta_link_page) never mis-resolve.
  if (cta.cta_link_type == null && cta.external_url) {
    return cta.external_url
  }

  const type =
    cta.cta_link_type ?? (cta.cta_link_page ? "cms_page" : null)

  if (type === "store") {
    return `/${languageCode}/store`
  }

  if (type === "category") {
    const profiles = cta.cta_link_category?.category_profiles ?? []
    const profile =
      profiles.find(
        (p) => p.language.toLowerCase() === languageCode.toLowerCase()
      ) ?? profiles[0]
    const permalink = profile?.meta_information?.permalink
    return permalink ? `/${languageCode}/categories/${permalink}` : null
  }

  if (type === "collection") {
    const profiles = cta.cta_link_collection?.collection_profiles ?? []
    const profile =
      profiles.find(
        (p) => p.language.toLowerCase() === languageCode.toLowerCase()
      ) ?? profiles[0]
    const permalink = profile?.meta_information?.permalink
    return permalink ? `/${languageCode}/collections/${permalink}` : null
  }

  if (type === "cms_page" && cta.cta_link_page) {
    return buildLinkPageHref(cta.cta_link_page, languageCode)
  }

  return null
}

/**
 * Same resolution as `resolveCtaHref`, but strips the language prefix from
 * internal hrefs so the result is safe to pass to `LocalizedClientLink`
 * (which unconditionally prepends `/${languageCode}` itself — passing an
 * already-prefixed href would double it). External URLs pass through
 * unchanged. Used by the DB-driven nav/footer, which render exclusively via
 * `LocalizedClientLink` (unlike `CmsCtaButton`, which renders a raw `<a>`
 * and consumes `resolveCtaHref`'s prefixed output directly).
 */
export function resolveCtaHrefRelative(
  cta: CtaLike,
  languageCode: string
): string | null {
  const href = resolveCtaHref(cta, languageCode)
  if (!href) return null
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  const prefix = `/${languageCode}`
  if (href === prefix) return "/"
  return href.startsWith(prefix) ? href.slice(prefix.length) : href
}
