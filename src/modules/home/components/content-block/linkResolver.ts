import type { LinkPageAncestor } from "@lib/furnisystems-sdk/modules/shop-settings/types"

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
