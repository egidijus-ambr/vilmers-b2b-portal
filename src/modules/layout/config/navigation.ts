import { MenuItem } from "../components/nav-menu-item"

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
      id: "about",
      label: t("about-us"),
      type: "dropdown" as const,
      href: null,
      dropdown: {
        width: "w-auto min-w-48 max-w-64",
        layout: "single-column" as const,
        items: [
          { label: "FSC™ Vilmers", href: "https://vilmers.com/fsc-vilmers/" },
        ],
      },
    },
    {
      id: "contact",
      label: t("contact-us"),
      type: "link" as const,
      href: "/contact",
    },
  ],
})
