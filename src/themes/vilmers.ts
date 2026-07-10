import type { Theme } from "./types"

/**
 * Reference theme — the current, live Vilmers brand values lifted verbatim
 * from `tailwind.config.js`. New brands copy this file and change values.
 *
 * Note: `primary` is intentionally NOT a token here — it was a redundant
 * alias for `dark-blue` (both `#222D37`). It is collapsed in
 * `tailwind.config.js`, where `primary` resolves directly to
 * `var(--color-dark-blue)` instead of getting its own CSS variable.
 *
 * Constraint: `colors` and `surfaces` values must be a `#RRGGBB` hex string
 * (or, for `surfaces`, a primitive key from `colors`) — NOT `rgba()`/`rgb()`.
 * `tailwind.config.js` wraps these as `rgb(var(--color-x) / <alpha-value>)`
 * so Tailwind opacity modifiers work (see `themeToCssVars` in
 * `src/themes/index.ts`); an `rgba(...)` value there would produce invalid
 * CSS (`rgb(rgba(...) / a)`). The 4 pre-existing `rgba()` tokens below
 * (`divider`, `image-overlay`, `white-20`, `white-80`) are the documented
 * exception — they are emitted as full values and referenced via a bare
 * `var(--color-*)` (no opacity modifier ever applied to them).
 */
export const vilmers: Theme = {
  name: "vilmers",
  colors: {
    // Figma Design System Colors
    "dark-blue": "#222D37",
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
  // Semantic surface tokens (Layer 4). Each default is set to the primitive
  // that surface ACTUALLY renders with today (verified against the live
  // component code), so activating this tier is a visual no-op for Vilmers.
  // New brands override individual roles instead of raw hex.
  surfaces: {
    page_background: "gold-10", // <body> bg (src/app/layout.tsx)
    page_foreground: "dark-blue", // reserved: no explicit base text color exists on <body> today (browser default), so not yet applied anywhere — see themes/index.ts and layout.tsx for the mechanism only
    top_menu_background: "dark-blue", // top-bar bg (layout/components/top-bar)
    top_menu_foreground: "white", // top-bar text
    nav_background: "white", // nav bar bg, non-transparent state (layout/templates/nav)
    nav_foreground: "dark-blue", // nav links/icons, non-transparent state
    product_card_background: "gold-20", // applied to the product/category card container (B2BProductCard) — INTENTIONAL user decision: the card becomes a warm gold-20 panel, distinct from the gold-10 page background
    footer_background: "dark-blue", // footer bg (was `bg-primary`, alias of dark-blue)
    footer_foreground: "white", // footer text (headline + social icons)
    accent: "gold", // primary/gold button variant (common/components/button)
  },
  // RESERVED for v1 — today's `borderRadius` values, not yet consumed.
  radius: {
    none: "0px",
    soft: "2px",
    base: "4px",
    rounded: "8px",
    large: "16px",
    circle: "9999px",
  },
  // Navbar/layout config (see src/themes/types.ts). These are the CURRENT
  // live values — this block is a visual no-op for Vilmers.
  layout: {
    topBar: { show: true },
    backButton: { show: true },
    searchButton: { show: true },
    homepageHeader: { transparent: true },
    languageSwitcher: { placement: "top-bar" },
    logo: {
      position: "center",
      height: 24,
      heightMobile: 20,
      paddingY: 24, // navHeight = 24 + 2*24 = 72
    },
    newsletter: { show: true },
  },
}
