import type { Theme } from "./types"

/**
 * Second brand theme — verification vehicle for the theming + navbar/layout
 * mechanism. `colors`/`surfaces`/`radius` are currently a straight copy of
 * `vilmers.ts` (starting point; not yet brand-differentiated). `layout` is
 * given DISTINCT values from Vilmers so the layout mechanism (top bar
 * show/hide, language-switcher placement, logo position/size -> nav height)
 * is provably driven by the theme preset rather than hardcoded.
 *
 * Constraint: `colors` and `surfaces` values must be a `#RRGGBB` hex string
 * (or, for `surfaces`, a primitive key from `colors`) — NOT `rgba()`/`rgb()`.
 * See `vilmers.ts` for the full rationale (channel-form Tailwind wrapper).
 */
export const dominari: Theme = {
  name: "dominari",
  colors: {
    // Figma Design System Colors
    "dark-blue": "#22232c",
    "dark-blue-70": "#646C73",
    gold: "#9A8555",
    "gold-10": "#F5F3EE",
    "gold-20": "#EBE7DD",
    "gold-30": "#E1DACC",
    line: "#D3D5D7",
    beige: "#DFD6C7",
    "beige-20": "#F9F7F4",
    white: "#FFFFFF",
    sale: "#E07E5A",
    divider: "rgba(34, 45, 55, 0.1)", // #222D37 · 10%
    "image-overlay": "rgba(0, 0, 0, 0.4)", // #000000 · 40%
    "beige-80": "#E5DED2",
    "white-20": "rgba(255, 255, 255, 0.2)", // #FFFFFF · 20%
    "white-80": "rgba(255, 255, 255, 0.8)", // #FFFFFF · 80%
    "beige-10": "#FCFBF9",
    "gray-inactive": "#F4F4F5",
    // Status Colors
    "status-completed": "#A8C014",
    "status-awaiting-payment": "#E07E5A",
    "status-pending": "#D5C3B8",
    "status-shipping": "#879BB9",
    "status-canceled": "#DCDFEA",
    "status-paid": "#B58575",
    "status-delivered": "#C0BCC1",
    // Legacy `grey` 0-90 scale (flattened; tailwind.config.js re-nests these
    // under the `grey.<n>` object using the same `var(--color-grey-<n>)` refs).
    "grey-0": "#FFFFFF",
    "grey-5": "#F9FAFB",
    "grey-10": "#F3F4F6",
    "grey-20": "#E5E7EB",
    "grey-30": "#D1D5DB",
    "grey-40": "#9CA3AF",
    "grey-50": "#6B7280",
    "grey-60": "#4B5563",
    "grey-70": "#374151",
    "grey-80": "#1F2937",
    "grey-90": "#111827",
  },
  // Semantic surface tokens (Layer 4) — copied from Vilmers as a starting
  // point; not yet brand-differentiated.
  surfaces: {
    page_background: "white",
    page_foreground: "dark-blue",
    top_menu_background: "dark-blue",
    top_menu_foreground: "white",
    nav_background: "white",
    nav_foreground: "dark-blue",
    product_card_background: "gold-20",
    footer_background: "dark-blue",
    footer_foreground: "white",
    hero_background: "dark-blue", // home hero bg — hero headings are text-white, so dark-blue (dominari's own #22232c) keeps them readable, same primitive as footer_background
    accent: "gold",
  },
  // RESERVED for v1 — copied from Vilmers, not yet consumed.
  radius: {
    none: "0px",
    soft: "2px",
    base: "4px",
    rounded: "8px",
    large: "16px",
    circle: "9999px",
  },
  // Navbar/layout config (see src/themes/types.ts) — DISTINCT from Vilmers,
  // used to verify the mechanism: top bar hidden, switcher moved into the
  // navbar, logo left-aligned and larger (taller nav).
  layout: {
    topBar: { show: false },
    backButton: { show: false },
    searchButton: { show: true },
    homepageHeader: { transparent: false },
    languageSwitcher: { placement: "navbar" },
    logo: {
      position: "left",
      height: 40,
      heightMobile: 32,
      paddingY: 24, // navHeight = 40 + 2*24 = 88
    },
    newsletter: { show: false },
  },
}
