import type { ProductContainer } from '../products/types'

export interface EnabledLanguage {
  id: string
  language: string
  web_address_enabled: boolean
  default_language: boolean
  web_address: string
  shop_phone_number?: string
  google_analytics?: string
  google_tag_manager?: string
  facebook_pixel?: string
  facebook_page_id?: string
  hotjar?: string
  enable_language_switcher: boolean
  price_multiplier?: number
}

export interface ContentBlockProfile {
  id: string
  name: string | null
  description: string | null
  description_format?: "plain" | "markdown" | null
  link: string | null
  language: string
}

export interface ContentBlockImage {
  id: string
  src: string
  display_order?: number
}

export interface ContentBlockLinkedItem {
  id: string
  title: string
  link: string
  arrangement: number
  image: ContentBlockImage | null
}

export interface CategoryTileItem {
  id: number
  image: { id: number; src: string } | null
  banners: { id: number; src: string }[]
  category_profiles: {
    id: number
    name: string
    language: string
    meta_information: {
      permalink: string
    }
  }[]
}

/** Flat ancestor node for link_page — root-first from the backend `ancestors` field */
export interface LinkPageAncestor {
  page_profiles: { slug: string; language: string }[]
}

export interface ContentBlock {
  id: string
  type: "text_and_image" | "text_and_video" | "only_text" | "only_image" | "only_video" | "gallery" | "button" | "photo_links" | "category_tiles" | "product_grid" | "page_grid" | "email_signup" | "pdf_flipbook"
  style: string | null
  video_link: string | null
  video_type: "uploaded" | "youtube" | "vimeo" | null
  video_autoplay: boolean | null
  video_loop: boolean | null
  arrangement: number | null
  main_image: ContentBlockImage | null
  gallery_images?: ContentBlockImage[]
  content_block_profiles: ContentBlockProfile[]
  default_margins: boolean | null
  max_height: number | null
  max_width: number | null
  min_height: number | null
  min_width: number | null
  top_margin: string | null
  bottom_margin: string | null
  left_margin: string | null
  right_margin: string | null
  background_color: string | null
  text_color: string | null
  media_max_height: number | null
  media_max_width: number | null
  media_min_height: number | null
  media_min_width: number | null
  object_fit_cover: boolean | null
  link_new_tab: boolean | null
  link_page: {
    id: string
    parentId?: string | null
    page_profiles: { slug: string; language: string }[]
    ancestors?: LinkPageAncestor[] | null
  } | null
  extra_css: Record<string, unknown> | string | null
  linked_items?: ContentBlockLinkedItem[]
  config?: Record<string, unknown> | null
  categories?: CategoryTileItem[]
  products?: ProductContainer[]
  product_containers?: { id: number }[]
  grid_pages?: {
    id: string
    page_profiles: { slug: string; title: string; language: string }[]
    hero_image: { src: string } | null
    ancestors?: LinkPageAncestor[] | null
    tags?: {
      id: string
      slug: string
      page_tag_profiles: { name: string; language: string }[]
    }[]
  }[]
  grid_tags?: {
    id: string
    slug: string
    page_tag_profiles: { name: string; language: string }[]
  }[]
}

/** Mirrors the backend `CtaLinkType` enum (see `linkTargetInputFields`/`linkTargetScalarWrite`). */
export type NavCtaLinkType = "cms_page" | "category" | "store" | "collection"

/**
 * Shared link-target scalars carried by NavigationItem, NavigationItemLink,
 * and FooterLink — mirrors the backend's `linkTargetInputFields`. Exactly one
 * of the FK ids is set (matching `link_type`), or `external_url` is set when
 * `link_type` is null (the "escape hatch" — see `linkTargetScalarWrite`).
 */
export interface NavLinkTargetFields {
  link_type: NavCtaLinkType | null
  link_page_id: string | null
  link_category_id: number | null
  link_collection_id: number | null
  external_url: string | null
  link_new_tab: boolean
  link_page: LinkPageLike | null
  link_category: {
    category_profiles?:
      | {
          language: string
          meta_information?: { permalink?: string | null } | null
        }[]
      | null
  } | null
  link_collection: {
    collection_profiles?:
      | {
          language: string
          meta_information?: { permalink?: string | null } | null
        }[]
      | null
  } | null
}

/**
 * `LinkPageAncestor` + the page's own profiles — matches `buildLinkPageHref`'s `LinkPageLike`.
 *
 * `parentId` must be selected alongside `ancestors`: the backend's `ancestors`
 * resolver reads `root.parentId` to walk up the tree — omit it and `ancestors`
 * silently returns `[]` even for a genuinely nested page (verified live),
 * which would drop the parent segment from the built href.
 */
type LinkPageLike = {
  id: string
  parentId?: string | null
  page_profiles: { slug: string; language: string }[]
  ancestors?: LinkPageAncestor[] | null
}

/** Page-profile shape used across the `panel_root_page` hierarchy (root/child/grandchild) — language/slug/title only, matching what buildPageSourcedColumns needs to render headings and links. */
export interface PanelPageProfile {
  language: string
  slug: string | null
  title: string | null
}

/** Deepest level selected under `panel_root_page` — no further nesting is fetched (see navigation-db.ts's buildPageSourcedColumns). */
export interface PanelGrandchildPage {
  id: string
  page_profiles: PanelPageProfile[]
}

/** Child of `panel_root_page`. Presence of its own `children` (grandchildren) is what promotes it from a flat link to a column heading. Force-filtered to published rows by the backend resolver. */
export interface PanelChildPage {
  id: string
  published?: boolean | null
  page_profiles: PanelPageProfile[]
  children?: PanelGrandchildPage[]
}

/**
 * CMS page a `mega_menu` nav item can be sourced from instead of categories
 * (see `NavigationItem.panel_root_page`). Unlike its children, this node is
 * NOT published-filtered by the backend — callers must check `published`
 * themselves and treat an unpublished root as "no page source set".
 *
 * `parentId` must be selected alongside `ancestors`: the backend's
 * `ancestors` resolver reads `root.parentId` to walk up the tree — omit it
 * and `ancestors` silently returns `[]` even for a genuinely nested root
 * page (verified live), which would drop the parent segment from every
 * child href built from it.
 */
export interface PanelRootPage {
  id: string
  published: boolean | null
  parentId?: string | null
  page_profiles: PanelPageProfile[]
  ancestors?: LinkPageAncestor[] | null
  children?: PanelChildPage[]
}

export interface NavigationItemProfile {
  language: string
  label: string
}

/** Tag on a `FeaturedPage` — supplies the featured card's small italic label line (per-language tag names, joined). */
export interface FeaturedPageTag {
  id: string
  slug: string
  page_tag_profiles: { name: string; language: string }[]
}

/** Page-profile shape for a `FeaturedPage` — includes `title`, unlike `LinkPageAncestor`'s slug-only profiles. */
export interface FeaturedPagePageProfile {
  language: string
  slug: string | null
  title: string | null
}

/**
 * The CMS Page a `mega_menu` navigation item's featured card is now derived
 * from (replaces the old admin-authored `NavigationFeaturedCard`). Not
 * published-filtered by the backend — callers must check `published`
 * themselves. `parentId` must be selected alongside `ancestors` for the same
 * resolver-quirk reason documented on `PanelRootPage`.
 */
export interface FeaturedPage {
  id: string
  code: string
  published: boolean | null
  parentId?: string | null
  page_profiles: FeaturedPagePageProfile[]
  hero_image: { id: string; src: string; src_md: string | null; src_xs: string | null } | null
  tags?: FeaturedPageTag[]
  ancestors?: LinkPageAncestor[] | null
}

export interface NavigationItemLinkProfile {
  language: string
  label: string
}

/** A single admin-curated link inside a `type: "dropdown"` navigation item's single-column list. */
export interface NavigationItemLink extends NavLinkTargetFields {
  id: number
  arrangement: number
  profiles: NavigationItemLinkProfile[]
}

export interface NavigationItem extends NavLinkTargetFields {
  id: number
  arrangement: number
  type: "link" | "mega_menu" | "dropdown"
  /**
   * Which source fills a `mega_menu` item's panel. Persisted server-side
   * rather than derived, because `"manual"` nulls BOTH `panel_root_*` ids.
   * Always `"categories"` (the column default) for non-mega items.
   */
  panel_source: "categories" | "page" | "manual"
  panel_root_category_id: number | null
  panel_root_page_id: string | null
  panel_root_page: PanelRootPage | null
  navigation_item_profiles: NavigationItemProfile[]
  featured_page_id: string | null
  featured_page: FeaturedPage | null
  /**
   * Populated for `type === "dropdown"` items and for `mega_menu` items whose
   * `panel_source` is `"manual"`; empty otherwise.
   */
  links: NavigationItemLink[]
}

export interface FooterColumnProfile {
  language: string
  heading: string
}

export interface FooterLinkProfile {
  language: string
  label: string
}

export interface FooterLink extends NavLinkTargetFields {
  id: number
  arrangement: number
  footer_link_profiles: FooterLinkProfile[]
}

export interface FooterColumn {
  id: number
  arrangement: number
  footer_column_profiles: FooterColumnProfile[]
  footer_links: FooterLink[]
}

export interface ShopSetting {
  id: string
  currency: string
  enabled_languages: EnabledLanguage[]
  homepage_content_blocks?: ContentBlock[]
  favicon?: ContentBlockImage | null
  default_meta_image?: ContentBlockImage | null
  footer_logo_image?: ContentBlockImage | null
  footer_copyright_text?: string | null
  footer_address?: string | null
  footer_phone?: string | null
  footer_email?: string | null
  facebook?: string | null
  twitter?: string | null
  instagram?: string | null
  pinterest?: string | null
  linkedin?: string | null
  navigation_items?: NavigationItem[]
  footer_columns?: FooterColumn[]
  default_manufacturer?: {
    company_name?: string | null
    logo_image?: ContentBlockImage | null
  } | null
}

export interface ShopSettingsResponse {
  findFirstShopSetting: ShopSetting
}
