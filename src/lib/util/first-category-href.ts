import type { CategoryData } from "@lib/furnisystems-sdk"
import type { NavigationItem as DbNavigationItem } from "@lib/furnisystems-sdk/modules/shop-settings/types"
import { buildNavigationFromSettings } from "@modules/layout/config/navigation-db"
import {
  buildCategoryHref,
  getCategoryPermalink,
} from "@modules/layout/config/navigation"

const FALLBACK_HREF = "/store"

const isCategoryHref = (href: string | null | undefined): href is string =>
  typeof href === "string" && href.startsWith("/categories/")

/**
 * Language-less href (e.g. `/categories/soft-furniture`) of the first Store
 * mega-menu column heading — the landing page used after an agent/admin picks
 * a customer or an admin impersonates one. Uses the same inputs as the Nav,
 * so it always matches what the first Store column shows.
 *
 * Pure and server-safe (no hooks, no browser APIs). Never throws on missing
 * data; ends at `/store`.
 */
export function getFirstCategoryHref(
  navigationItems: DbNavigationItem[] | null | undefined,
  categories: CategoryData[] | null | undefined,
  languageCode: string
): string {
  const cats = categories ?? []

  if (navigationItems && navigationItems.length > 0) {
    const menu = buildNavigationFromSettings(navigationItems, cats, languageCode)
    const megaPanel = (item: (typeof menu)[number]) =>
      item.type === "dropdown" && item.dropdown?.layout === "mega-panel"
    const storeItem =
      menu.find((item) => item.isStoreLink && megaPanel(item)) ??
      menu.find(megaPanel)
    const columns = storeItem?.dropdown?.columns ?? []

    const heading = columns.find((col) => isCategoryHref(col.href))
    if (heading?.href) return heading.href

    for (const col of columns) {
      const link = col.links?.find((l) => isCategoryHref(l.href))
      if (link) return link.href
    }
    // A DB nav exists but has no category column: still prefer a real
    // category over /store before giving up.
  }

  const firstRoot = cats.find(
    (c) => c.show_in_menu && getCategoryPermalink(c)
  )
  const legacy = firstRoot
    ? buildCategoryHref(getCategoryPermalink(firstRoot))
    : null
  return legacy ?? FALLBACK_HREF
}

/** Same as `getFirstCategoryHref`, prefixed with `/${languageCode}`. */
export function getFirstCategoryUrl(
  navigationItems: DbNavigationItem[] | null | undefined,
  categories: CategoryData[] | null | undefined,
  languageCode: string
): string {
  return `/${languageCode}${getFirstCategoryHref(
    navigationItems,
    categories,
    languageCode
  )}`
}
