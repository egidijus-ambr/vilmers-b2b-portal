import type { CategoryData } from "@lib/furnisystems-sdk"
import type {
  NavigationItem as DbNavigationItem,
  NavigationItemLink as DbNavigationItemLink,
  NavLinkTargetFields,
  PanelRootPage,
  FeaturedPage,
  LinkPageAncestor,
} from "@lib/furnisystems-sdk/modules/shop-settings/types"
import {
  resolveCtaHrefRelative,
  toCtaLike,
} from "@modules/home/components/content-block/linkResolver"
import { resolveProfileValue } from "@modules/fabric-palettes/utils/fabric-profile-helpers"
import type {
  MenuItem,
  DropdownItem,
  MegaMenuLink,
  MegaMenuColumn,
  MegaMenuFeaturedCard,
} from "../components/nav-menu-item"
import { getCategoryName, getCategoryPermalink, buildCategoryHref } from "./navigation"

function resolveTargetHref(
  target: NavLinkTargetFields,
  languageCode: string
): string | null {
  return resolveCtaHrefRelative(toCtaLike(target), languageCode)
}

/** True when this link-target row is the "store" (all products) target. */
function isStoreTarget(target: NavLinkTargetFields): boolean {
  return target.link_type === "store"
}

function findCategoryById(
  categories: CategoryData[],
  id: number
): CategoryData | null {
  for (const category of categories) {
    if (category.id === id) return category
    const found = findCategoryById(category.child_categories ?? [], id)
    if (found) return found
  }
  return null
}

/**
 * Columns for a mega-panel item: when `panelRootCategoryId` is null, every
 * root show_in_menu category is a column (heading links to the category,
 * links = its direct children). When set, that category's own children
 * become the columns (their children become the links).
 */
function buildMegaMenuColumns(
  panelRootCategoryId: number | null,
  categories: CategoryData[],
  languageCode: string
): MegaMenuColumn[] {
  let sourceCategories: CategoryData[]

  if (panelRootCategoryId == null) {
    sourceCategories = categories
  } else {
    const root = findCategoryById(categories, panelRootCategoryId)
    sourceCategories = root?.child_categories ?? []
  }

  return sourceCategories
    .filter((cat) => cat.show_in_menu)
    .map((cat) => {
      const heading = getCategoryName(cat)
      const href = buildCategoryHref(getCategoryPermalink(cat))
      const links = (cat.child_categories ?? [])
        .filter((child) => child.show_in_menu)
        .map((child) => ({
          label: getCategoryName(child),
          href: buildCategoryHref(getCategoryPermalink(child)),
        }))

      return { heading, href, links }
    })
}

/**
 * Resolve a page-hierarchy node's slug for `languageCode`, falling back to
 * its first profile — mirrors `buildLinkPageHref`'s per-node profile
 * matching. Loosely typed (just `slug`/`language`) so it also accepts
 * `panel_root_page.ancestors`' profiles, which don't carry `title`.
 */
function resolvePanelSlug(
  profiles: { slug: string | null; language: string }[],
  languageCode: string
): string | null {
  const lang = languageCode.toLowerCase()
  const profile =
    profiles.find((p) => p.language.toLowerCase() === lang) ?? profiles[0]
  return profile?.slug ?? null
}

/**
 * Structural shape needed by `buildPanelRootSegments`: any page-like node
 * carrying `page_profiles` + a root-first `ancestors` chain. Satisfied by
 * both `PanelRootPage` (mega-panel page source) and `FeaturedPage`
 * (featured-card source) without either pretending to be the other.
 */
type SegmentSourcePage = {
  page_profiles: { slug: string | null; language: string }[]
  ancestors?: LinkPageAncestor[] | null
}

/**
 * Root-first path segments for a page-like node (`panel_root_page` or
 * `featured_page`): its ancestors' slugs (root-first) + its own slug —
 * WITHOUT a language prefix, since these feed `LocalizedClientLink` (which
 * prepends the language itself), unlike `buildLinkPageHref`'s prefixed
 * output. Returns null when the root has no slug for any language.
 */
function buildPanelRootSegments(
  root: SegmentSourcePage,
  languageCode: string
): string[] | null {
  const segments: string[] = []
  for (const ancestor of root.ancestors ?? []) {
    const slug = resolvePanelSlug(ancestor.page_profiles, languageCode)
    if (slug) segments.push(slug)
  }
  const ownSlug = resolvePanelSlug(root.page_profiles, languageCode)
  if (!ownSlug) return null
  segments.push(ownSlug)
  return segments
}

function panelPageHref(parentSegments: string[], slug: string): string {
  return `/${[...parentSegments, slug].join("/")}`
}

/**
 * Columns for a page-sourced mega-panel item: `item.panel_root_page`'s
 * children populate the panel instead of categories.
 *
 * When at least one child has grandchildren, every child becomes its own
 * headed column — heading = child title (clickable to the child page),
 * links = the child's own children (empty when that particular child has
 * none, e.g. a flat page like a blog article: that column then renders as
 * a bare clickable heading with no links beneath it).
 *
 * When NO child has grandchildren (the whole root is flat, e.g. a simple
 * list of pages), headed columns would be one uppercase heading per child
 * with no links under any of them — instead, collapse to heading-less
 * columns whose links are the children themselves (chunked by
 * `chunkIntoColumns`), rendered as a normal vertical link list.
 *
 * Returns null when there's nothing renderable (unpublished root, no
 * children, no resolvable root path, or every child fails the
 * title/href filter) so the caller falls back to the category-column
 * behavior as if no page source were set.
 */
function buildPageSourcedColumns(
  root: PanelRootPage,
  languageCode: string
): MegaMenuColumn[] | null {
  if (!root.published) return null

  const children = root.children ?? []
  if (children.length === 0) return null

  const rootSegments = buildPanelRootSegments(root, languageCode)
  if (!rootSegments) return null

  const hasGrandchildren = children.some(
    (child) => (child.children ?? []).length > 0
  )

  if (!hasGrandchildren) {
    const links = children
      .map((child) => {
        const label = resolveProfileValue(
          child.page_profiles,
          languageCode,
          (p) => p.title
        )
        const childSlug = resolvePanelSlug(child.page_profiles, languageCode)
        return {
          label,
          href: childSlug ? panelPageHref(rootSegments, childSlug) : null,
        }
      })
      .filter((link) => link.label && link.href)

    if (links.length === 0) return null

    // Chunked for the same reason a manual list is — a single column in this
    // panel hugs the left edge at its intrinsic width. This was previously
    // one column regardless of length.
    return chunkIntoColumns(links)
  }

  const columns = children
    .map((child) => {
      const heading = resolveProfileValue(
        child.page_profiles,
        languageCode,
        (p) => p.title
      )
      const childSlug = resolvePanelSlug(child.page_profiles, languageCode)
      const heading_href = childSlug
        ? panelPageHref(rootSegments, childSlug)
        : null
      const childSegments = childSlug ? [...rootSegments, childSlug] : rootSegments

      const links = (child.children ?? [])
        .map((grandchild) => {
          const label = resolveProfileValue(
            grandchild.page_profiles,
            languageCode,
            (p) => p.title
          )
          const grandchildSlug = resolvePanelSlug(
            grandchild.page_profiles,
            languageCode
          )
          return {
            label,
            href: grandchildSlug
              ? panelPageHref(childSegments, grandchildSlug)
              : null,
          }
        })
        .filter((link) => link.label && link.href)

      return { heading, href: heading_href, links }
    })
    .filter((column) => column.heading && column.href)

  if (columns.length === 0) return null

  return columns
}

/** Column count cap for a flat link list — matches the density of the category-sourced panels. */
const MAX_FLAT_COLUMNS = 3
/** Target links per column before a second (then third) column is opened. */
const LINKS_PER_COLUMN = 4

/**
 * Split a flat link list into balanced heading-less columns.
 *
 * `MegaMenuPanel` gives each column NO width class — the wrapper is
 * `flex flex-wrap gap-x-24` inside a `flex justify-between` row under
 * `max-w-9xl`. A single column therefore shrinks to its intrinsic text width
 * and hugs the left edge, so a long flat list renders as a tall thin ribbon
 * with a wide empty gap before the featured card. Chunking fills the panel
 * using the layout that is already there, with no component change.
 *
 * Links read DOWN each column and then across, preserving authored order:
 * up to 4 links stay in one column, 5-8 split across two, more across three.
 */
export function chunkIntoColumns(links: MegaMenuLink[]): MegaMenuColumn[] {
  if (links.length === 0) return []

  const columnCount = Math.min(
    MAX_FLAT_COLUMNS,
    Math.max(1, Math.ceil(links.length / LINKS_PER_COLUMN))
  )
  const perColumn = Math.ceil(links.length / columnCount)

  const columns: MegaMenuColumn[] = []
  for (let start = 0; start < links.length; start += perColumn) {
    columns.push({
      heading: null,
      href: null,
      links: links.slice(start, start + perColumn),
    })
  }
  return columns
}

/**
 * Columns for a manual-source mega panel: the item's own admin-curated
 * `links` — the same `NavigationItemLink` rows a `dropdown` item uses —
 * chunked to fill the panel. Rows with no resolvable label or href are
 * dropped, matching `buildDropdownItems`: an admin can save a link before
 * wiring its target.
 */
function buildManualColumns(
  links: DbNavigationItemLink[],
  languageCode: string
): MegaMenuColumn[] {
  const megaLinks: MegaMenuLink[] = []
  for (const link of links) {
    const label = resolveProfileValue(link.profiles, languageCode, (p) => p.label)
    const href = resolveTargetHref(link, languageCode)
    if (label && href) {
      megaLinks.push({ label, href, newTab: link.link_new_tab })
    }
  }
  return chunkIntoColumns(megaLinks)
}

/** Matches the width the legacy/category-driven single-column dropdowns use (see navigation.ts). */
const SINGLE_COLUMN_DROPDOWN_WIDTH = "w-auto min-w-48 max-w-64"

/**
 * Flat single-column dropdown items for a `type: "dropdown"` navigation item,
 * built from its admin-curated `links`. Links with no resolvable label or
 * href are dropped — an admin can save a link before wiring its target/label.
 */
function buildDropdownItems(
  links: DbNavigationItemLink[],
  languageCode: string
): DropdownItem[] {
  const items: DropdownItem[] = []
  for (const link of links) {
    const label = resolveProfileValue(link.profiles, languageCode, (p) => p.label)
    const href = resolveTargetHref(link, languageCode)
    if (label && href) {
      items.push({ label, href, newTab: link.link_new_tab })
    }
  }
  return items
}

/**
 * The featured card's small italic label line: the featured page's tag
 * names for `languageCode`, comma-joined. Mirrors `resolveTagLabel` in the
 * page-grid content block (same `page_tag_profiles` shape) — duplicated
 * rather than shared since that helper lives in a content-block-specific
 * module. Returns null when the page has no tags or none resolve to a name.
 */
function resolveFeaturedPageTagLabel(
  page: FeaturedPage,
  languageCode: string
): string | null {
  const names = (page.tags ?? [])
    .map((tag) =>
      resolveProfileValue(tag.page_tag_profiles, languageCode, (p) => p.name)
    )
    .filter((name) => name.trim())
  return names.length > 0 ? names.join(", ") : null
}

/**
 * Build the mega-menu featured card from a `mega_menu` nav item's
 * `featured_page` — a CMS Page, replacing the old admin-authored
 * `NavigationFeaturedCard`. Image = the page's hero image, title = the
 * page's per-language title, label = its tag names, href = the page itself
 * (root-first ancestors + own slug, via the same segment-building
 * `panel_root_page` uses).
 *
 * Returns null when there's no featured page, it's unpublished (`Page.published`
 * is NOT filtered by the backend for this field — see `FeaturedPage`'s doc
 * comment), or it has no resolvable title for any language. An unresolvable
 * href (e.g. a slug-less page, or a truncated `ancestors` chain from a
 * published-filter cutoff) degrades to a non-navigating card rather than
 * dropping it, matching how `resolveTargetHref` already behaved for the old
 * admin-curated card.
 */
function buildFeaturedCard(
  page: FeaturedPage | null,
  languageCode: string
): MegaMenuFeaturedCard | null {
  if (!page || !page.published) return null

  const title = resolveProfileValue(page.page_profiles, languageCode, (p) => p.title)
  if (!title) return null

  const segments = buildPanelRootSegments(page, languageCode)

  return {
    title,
    label: resolveFeaturedPageTagLabel(page, languageCode),
    imageSrc: page.hero_image?.src_md ?? page.hero_image?.src ?? null,
    href: segments ? `/${segments.join("/")}` : null,
    newTab: false,
  }
}

/**
 * Build the desktop/mobile `MenuItem[]` tree from admin-authored
 * `navigation_items` + the already-fetched category tree. Selected instead
 * of the static/legacy chain whenever `navigationItems` has rows — see
 * nav/index.tsx.
 */
export function buildNavigationFromSettings(
  navigationItems: DbNavigationItem[],
  categories: CategoryData[],
  languageCode: string
): MenuItem[] {
  return navigationItems.map((item) => {
    const label = resolveProfileValue(
      item.navigation_item_profiles,
      languageCode,
      (p) => p.label
    )
    const isStoreLink = isStoreTarget(item)

    if (item.type === "mega_menu") {
      // Three mutually exclusive sources, mirroring the backend's
      // `resolveNavPanelWrite`. Dispatched on the persisted `panel_source`
      // rather than inferred from which id happens to be set — that's the
      // whole point of persisting it. Neither `manual` nor `page` has a
      // derived fallback: a page-sourced panel whose page is unpublished,
      // empty or unresolvable must degrade, not silently turn into the
      // entire show_in_menu tree (which is what
      // `buildMegaMenuColumns(null, …)` returns).
      let columns: MegaMenuColumn[]
      if (item.panel_source === "manual") {
        columns = buildManualColumns(item.links ?? [], languageCode)
      } else if (item.panel_source === "page") {
        columns =
          (item.panel_root_page
            ? buildPageSourcedColumns(item.panel_root_page, languageCode)
            : null) ?? []
      } else {
        columns = buildMegaMenuColumns(
          item.panel_root_category_id,
          categories,
          languageCode
        )
      }

      const featuredCard = buildFeaturedCard(item.featured_page, languageCode)

      // Nothing renderable in a manual or page-sourced panel: unlike the
      // category source, there is no tree to fall back to, so drop the
      // dropdown affordance and degrade to a plain link — but ONLY when
      // there is also no featured card. MegaMenuPanel renders a card-only
      // panel correctly (see its `columns.length === 0 && !featuredCard`
      // guard), so a panel that still has a card must survive. The item
      // keeps its own link target (if it has one), via the same
      // `resolveTargetHref` the non-degraded return below uses — it only
      // loses the panel affordance, not its clickability.
      if (
        item.panel_source !== "categories" &&
        columns.length === 0 &&
        !featuredCard
      ) {
        return {
          id: `db-${item.id}`,
          label,
          type: "link",
          href: resolveTargetHref(item, languageCode),
          isStoreLink,
        } satisfies MenuItem
      }

      return {
        id: `db-${item.id}`,
        label,
        type: "dropdown",
        href: resolveTargetHref(item, languageCode),
        isStoreLink,
        dropdown: {
          width: "w-auto",
          layout: "mega-panel",
          items: [],
          columns,
          featuredCard,
        },
      } satisfies MenuItem
    }

    if (item.type === "dropdown") {
      const dropdownItems = buildDropdownItems(item.links ?? [], languageCode)

      // No surviving links: match the mega-panel precedent of rendering
      // whatever it has (there's no legacy single-column example of an
      // empty dropdown to follow) by dropping the dropdown affordance
      // entirely and falling back to a plain, non-clickable label.
      if (dropdownItems.length === 0) {
        return {
          id: `db-${item.id}`,
          label,
          type: "link",
          href: null,
          isStoreLink,
        } satisfies MenuItem
      }

      return {
        id: `db-${item.id}`,
        label,
        type: "dropdown",
        href: resolveTargetHref(item, languageCode),
        isStoreLink,
        dropdown: {
          width: SINGLE_COLUMN_DROPDOWN_WIDTH,
          layout: "single-column",
          items: dropdownItems,
        },
      } satisfies MenuItem
    }

    return {
      id: `db-${item.id}`,
      label,
      type: "link",
      href: resolveTargetHref(item, languageCode),
      isStoreLink,
      newTab: item.link_new_tab,
    } satisfies MenuItem
  })
}
