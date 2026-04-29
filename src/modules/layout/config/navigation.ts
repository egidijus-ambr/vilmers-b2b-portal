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
      id: "products",
      label: t("products"),
      type: "dropdown" as const,
      href: null,
      dropdown: {
        width: "w-auto min-w-48 max-w-64",
        layout: "single-column" as const,
        items: [
          {
            label: "Soft Furniture",
            href: null,
            hasSubmenu: true,
            submenu: {
              title: "Soft Furniture",
              items: [
                {
                  label: "Sofas",
                  href: null,
                  hasSubmenu: true,
                  submenu: {
                    title: "Sofas",
                    items: [
                      {
                        label: "All Sofas",
                        href: "https://vilmers.com/sofas/",
                      },
                      {
                        label: "New Arrivals",
                        href: "https://vilmers.com/sofas/?jsf=jet-engine:listing_grid&tax=sofa_category:14",
                      },
                      {
                        label: "Bed Sofas",
                        href: "https://vilmers.com/sofas/?jsf=jet-engine:listing_grid&tax=sofa_category:210",
                      },
                      {
                        label: "Recliner Sofas",
                        href: "https://vilmers.com/sofas/?jsf=jet-engine:listing_grid&tax=sofa_category:20",
                      },
                    ],
                  },
                },
                {
                  label: "Outdoor sofas",
                  href: "https://vilmers.com/outdoor-sofas/",
                },
                { label: "Armchairs", href: "https://vilmers.com/armchairs/" },
                {
                  label: "Comfort chairs",
                  href: "https://vilmers.com/comfort-chairs/",
                },
                {
                  label: "Footstools",
                  href: "https://vilmers.com/comfort-chairs/",
                },
                {
                  label: "Accessories",
                  href: "https://vilmers.com/accessories/",
                },
                { label: "Benches", href: "https://vilmers.com/benches/" },
                { label: "Pet beds", href: "https://vilmers.com/pet-beds/" },
                { label: "Beds", href: "https://vilmers.com/beds/" },
              ],
            },
          },
          {
            label: "Hard Furniture",
            href: null,
            hasSubmenu: true,
            submenu: {
              title: "Hard Furniture",
              items: [
                {
                  label: "Coffee Tables",
                  href: "https://vilmers.com/coffee-tables/",
                },
              ],
            },
          },
          { label: "Decorations", href: "https://vilmers.com/decorations/" },
          { label: "Care", href: "https://vilmers.com/discover/care/" },
          { label: "Covers", href: "https://vilmers.com/discover/covers/" },
        ],
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
function getCategoryName(category: CategoryData): string {
  const profile = category.category_profiles?.[0]
  return profile?.name ?? ""
}

/** Get the permalink from a category's profile meta_information */
function getCategoryPermalink(category: CategoryData): string | null {
  const profile = category.category_profiles?.[0]
  return profile?.meta_information?.permalink ?? null
}

/** Build a category page href from a permalink */
function buildCategoryHref(permalink: string | null): string | null {
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
 * Replaces only the "products" menu item; keeps inspiration, about, contact unchanged.
 *
 * If a category has is_root_category=true, all OTHER root-level categories
 * become its children in the dropdown alongside its own DB children.
 */
export function buildDynamicMenuItems(
  categories: CategoryData[],
  t: TranslationFunction
): MenuItem[] {
  const staticConfig = getNavigationConfig(t)

  const rootCategory = categories.find((cat) => cat.is_root_category)

  let dynamicItems: DropdownItem[]

  if (rootCategory) {
    const otherCategories = categories.filter(
      (cat) => cat.id !== rootCategory.id && cat.show_in_menu
    )
    const ownChildren = rootCategory.child_categories ?? []
    const ownVisibleChildren = ownChildren.filter((c) => c.show_in_menu)
    const ownItems = categoriesToDropdownItems(ownVisibleChildren)
    const otherItems = categoriesToDropdownItems(otherCategories)
    dynamicItems = [...ownItems, ...otherItems]
  } else {
    dynamicItems = categoriesToDropdownItems(categories)
  }

  return staticConfig.menuItems.map((item) => {
    if (item.id === "products") {
      return {
        ...item,
        href: rootCategory
          ? buildCategoryHref(getCategoryPermalink(rootCategory))
          : null,
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
