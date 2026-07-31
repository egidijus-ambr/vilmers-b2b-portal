import { MenuItem } from "../components/nav-menu-item"
import { DropdownItem } from "../components/nav-menu-item"
import { CategoryData } from "@lib/furnisystems-sdk"

// Translation function type
type TranslationFunction = (key: string) => string

// Function to generate navigation config with translations
export const getNavigationConfig = (
  t: TranslationFunction
): { menuItems: MenuItem[] } => ({
  menuItems: [
    {
      id: "store",
      label: t("store"),
      type: "dropdown" as const,
      href: "/store",
      // Stable flag the logo-left (Dominari) trim filters on — see
      // nav/index.tsx. DB-driven items set this from `link_type === "store"`
      // instead of `id`, since they never have id "store".
      isStoreLink: true,
      dropdown: {
        width: "w-auto min-w-48 max-w-64",
        layout: "single-column" as const,
        items: [],
      },
    },
    {
      id: "inspiration",
      label: t("inspiration"),
      type: "dropdown" as const,
      href: null,
      dropdown: {
        width: "w-auto min-w-48 max-w-64",
        layout: "single-column" as const,
        items: [
          {
            label: "News",
            href: "https://vilmers.com/inspiration/?jsf=jet-engine:inspiration_grid&tax=inspiration_category:109",
          },
          { label: "Flipbooks", href: "https://vilmers.com/flipbooks/" },
        ],
      },
    },
    {
      id: "contact",
      label: t("contact-us"),
      type: "link" as const,
      href: "https://vilmers.com/contact-us/",
    },
  ],
})

// --- Dynamic Navigation Helpers ---

/** Get the localized name from a category's profiles (first profile's name) */
export function getCategoryName(category: CategoryData): string {
  const profile = category.category_profiles?.[0]
  return profile?.name ?? ""
}

/** Get the permalink from a category's profile meta_information */
export function getCategoryPermalink(category: CategoryData): string | null {
  const profile = category.category_profiles?.[0]
  return profile?.meta_information?.permalink ?? null
}

/** Build a category page href from a permalink */
export function buildCategoryHref(permalink: string | null): string | null {
  if (!permalink) return null
  return `/categories/${permalink}`
}

/**
 * Recursively convert CategoryData[] to DropdownItem[].
 * Each category becomes a dropdown item; if it has children, they become a submenu.
 */
export function categoriesToDropdownItems(
  categories: CategoryData[]
): DropdownItem[] {
  return categories
    .filter((cat) => cat.show_in_menu)
    .map((cat) => {
      const name = getCategoryName(cat)
      const permalink = getCategoryPermalink(cat)
      const href = buildCategoryHref(permalink)
      const children = cat.child_categories ?? []
      const visibleChildren = children.filter((c) => c.show_in_menu)

      if (visibleChildren.length > 0) {
        return {
          label: name,
          href,
          hasSubmenu: true,
          submenu: {
            title: name,
            items: categoriesToDropdownItems(visibleChildren),
          },
        }
      }

      return {
        label: name,
        href,
      }
    })
}

/**
 * Build menu items with dynamic product categories from the database.
 * Replaces the "store" menu item's dropdown; keeps inspiration, about, contact unchanged.
 */
export function buildDynamicMenuItems(
  categories: CategoryData[],
  t: TranslationFunction
): MenuItem[] {
  const staticConfig = getNavigationConfig(t)

  const dynamicItems = categoriesToDropdownItems(
    categories.filter((cat) => cat.show_in_menu)
  )

  return staticConfig.menuItems.map((item) => {
    if (item.id === "store") {
      return {
        ...item,
        dropdown: {
          width: "w-auto min-w-48 max-w-64",
          layout: "single-column" as const,
          items: dynamicItems,
        },
      }
    }
    return item
  })
}
