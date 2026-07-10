/**
 * A brand theme: colors + surfaces (+ reserved spacing/radius slots for
 * future layers). One deployment = one brand = one `Theme`, selected at
 * build time via `NEXT_PUBLIC_THEME` (see `src/themes/index.ts`). Fonts are
 * NOT part of `Theme` — `next/font` loaders need static literal args, so the
 * per-brand font is wired directly in `src/themes/fonts.ts` (loader ->
 * `fontsByTheme` registry keyed by theme name), not through this type.
 */
export interface Theme {
  /** Registry key, e.g. "vilmers". Must match the `NEXT_PUBLIC_THEME` value. */
  name: string
  /**
   * Flat map of color token name -> CSS color value, e.g.
   * `"dark-blue": "#222D37"`. Rendered as `--color-<name>` CSS variables by
   * `themeToCssVars` and consumed by `tailwind.config.js` via
   * `rgb(var(--color-<name>) / <alpha-value>)`.
   *
   * Constraint: values should be `#RRGGBB` hex (converted to RGB channels by
   * `themeToCssVars` so Tailwind opacity modifiers work) — NOT `rgba()`/
   * `rgb()`. The pre-existing `rgba()` tokens (`divider`, `image-overlay`,
   * `white-20`, `white-80`) are the documented exception: they're passed
   * through as full values and referenced with a bare `var(--color-*)` in
   * the config (never combined with an opacity modifier).
   */
  colors: Record<string, string>
  /**
   * Semantic surface tokens (Layer 4) — role-based tier on top of the
   * primitive `colors` palette, e.g. `"top_menu_background": "dark-blue"`.
   * Each value is either a primitive token key from `colors` (e.g.
   * `"dark-blue"`), which resolves to `var(--color-dark-blue)`, or a raw
   * `#RRGGBB` hex value emitted as-is (same hex-not-rgba constraint as
   * `colors` — see above). Rendered as `--<token-kebab>` CSS variables
   * (snake_case key -> kebab-case var name) by `themeToCssVars`, consumed by
   * `tailwind.config.js` via `rgb(var(--<token-kebab>) / <alpha-value>)`.
   */
  surfaces: Record<string, string>
  /** RESERVED for v1 — maps to current spacing defaults. Not yet consumed. */
  spacing?: Record<string, string>
  /** RESERVED for v1 — maps to current `borderRadius` values. Not yet consumed. */
  radius?: Record<string, string>
  /**
   * Navbar/header layout configuration — lets each brand configure whether
   * the top bar shows, where the language switcher lives, where the logo
   * sits, and how tall the nav is (driven by logo size). Rendered as raw px
   * CSS variables (`--nav-height`, `--nav-logo-height`,
   * `--nav-logo-height-mobile`, `--top-bar-height`) by `themeToCssVars` — NOT
   * run through the color channel/`rgb()` wrapper — and consumed via
   * Tailwind arbitrary values (`h-[var(--nav-height)]`). The
   * enum/boolean fields (`topBar.show`, `languageSwitcher.placement`,
   * `logo.position`) are read directly from `activeTheme.layout` (a
   * build-time constant, same model as `features`), not emitted as CSS.
   */
  layout: ThemeLayout
}

export interface ThemeLayout {
  /** Whether the desktop top bar (today: language-switcher-only) renders. */
  topBar: { show: boolean }
  /** Whether the desktop-only Back button (left cluster, before the nav menu) renders. */
  backButton: { show: boolean }
  /** Whether the Search button (right cluster, either placement) renders. */
  searchButton: { show: boolean }
  /**
   * Whether the nav is transparent-over-hero at the top of the homepage
   * (animating to solid on scroll) or always solid. When `false`, the nav
   * never goes transparent (logo never inverts) and the homepage hero does
   * not slide under it — see `nav/index.tsx` and `home/components/hero`.
   */
  homepageHeader: { transparent: boolean }
  /**
   * Where the language switcher lives: in the top bar (today) or in the
   * navbar's right cluster (desktop-only; mobile always keeps the drawer
   * copy). Placing it in the navbar while `topBar.show` is `false` is a
   * contradiction if it were left in the top bar with the bar hidden — see
   * the fail-fast guard in `src/themes/index.ts`.
   */
  languageSwitcher: { placement: "top-bar" | "navbar" }
  logo: {
    /** `"center"` (today): equal-flex trick. `"left"`: start of left cluster. */
    position: "left" | "center"
    /** px, desktop — drives nav height together with `paddingY`. */
    height: number
    /** px, optional — defaults to `height` when omitted. */
    heightMobile?: number
    /** px — `navHeight = height + 2 * paddingY`. */
    paddingY: number
  }
  /**
   * Per-brand visibility for the `NewsletterBlock` component. This is the
   * SOLE control for the block (self-gated — see
   * `home/components/newsletter-block/index.tsx`); there is no page-level
   * feature flag anymore.
   */
  newsletter: { show: boolean }
}
