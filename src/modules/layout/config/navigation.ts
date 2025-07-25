import { MenuItem } from "../components/nav-menu-item"

export const navigationConfig: { menuItems: MenuItem[] } = {
  menuItems: [
    {
      id: "products",
      label: "Products",
      type: "dropdown" as const,
      href: "/products",
      dropdown: {
        width: "w-48",
        layout: "single-column" as const,
        items: [
          {
            label: "Soft Furniture",
            href: "/products/soft-furniture",
            hasSubmenu: true,
            submenu: {
              title: "Soft Furniture",
              items: [
                {
                  label: "Sofas",
                  href: "/products/sofas",
                  hasSubmenu: true,
                  submenu: {
                    title: "Sofas",
                    items: [
                      { label: "All Sofas", href: "/products/sofas" },
                      {
                        label: "New Arrivals",
                        href: "/products/outdoor-sofas",
                      },
                      { label: "Bed Sofas", href: "/products/armchairs" },
                      {
                        label: "Recliner Sofas",
                        href: "/products/comfort-chairs",
                      },
                    ],
                  },
                },
                { label: "Outdoor sofas", href: "/products/outdoor-sofas" },
                { label: "Armchairs", href: "/products/armchairs" },
                {
                  label: "Comfort chairs",
                  href: "/products/comfort-chairs",
                },
                { label: "Footstools", href: "/products/footstools" },
                { label: "Accessories", href: "/products/accessories" },
                { label: "Benches", href: "/products/benches" },
                { label: "Pet beds", href: "/products/pet-beds" },
                { label: "Beds", href: "/products/beds" },
              ],
            },
          },
          {
            label: "Hard Furniture",
            href: "/products/hard-furniture",
            hasSubmenu: true,
            submenu: {
              title: "Hard Furniture",
              items: [{ label: "Coffee Tables", href: "/products/sofas" }],
            },
          },
          { label: "Decorations", href: "/products/decorations" },
          { label: "Care", href: "/products/care" },
          { label: "Covers", href: "/products/covers" },
        ],
      },
    },
    {
      id: "inspiration",
      label: "Inspiration",
      type: "dropdown" as const,
      href: "/inspiration",
      dropdown: {
        width: "w-48",
        layout: "single-column" as const,
        items: [
          { label: "Room Ideas", href: "/inspiration/room-ideas" },
          { label: "Style Guides", href: "/inspiration/style-guides" },
          { label: "Trends", href: "/inspiration/trends" },
        ],
      },
    },
    {
      id: "about",
      label: "About us",
      type: "dropdown" as const,
      href: "/about",
      dropdown: {
        width: "w-48",
        layout: "single-column" as const,
        items: [
          { label: "Our Story", href: "/about/our-story" },
          { label: "Team", href: "/about/team" },
          { label: "Sustainability", href: "/about/sustainability" },
        ],
      },
    },
    {
      id: "contact",
      label: "Contact us",
      type: "link" as const,
      href: "/contact",
    },
  ],
}
