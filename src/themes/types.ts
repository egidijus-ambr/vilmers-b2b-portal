/**
 * A brand theme: colors + surfaces (+ reserved spacing/radius slots for
 * future layers). One deployment = one brand = one `Theme`, selected at
 * build time via `NEXT_PUBLIC_THEME` (see `src/themes/index.ts`). Fonts are
 * NOT part of `Theme` — `next/font` loaders need static literal args, so the
 * per-brand font is wired directly in `src/themes/fonts.ts` (loader ->
 * `fontsByTheme` registry keyed by theme name), not through this type.
 */
export interface HeadingToken {
  size?: string
  sizeLg?: string // desktop step at the `small` (1024px) breakpoint; h1/h2 only
  leading?: string
  tracking?: string // letter-spacing; eyebrow only
  weight?: string // font-weight; eyebrow only
}

export interface ThemeTypography {
  h1?: HeadingToken
  h2?: HeadingToken
  h3?: HeadingToken
  eyebrow?: HeadingToken // the h4 style; carried by the `h4` element rule AND the `.eyebrow` class
}

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
   * Heading typography tier (h1-h3 + the h4/"eyebrow" style) — optional;
   * when a tier or field is absent, `themeToCssVars` falls back to today's
   * live values, so an absent `typography` reproduces the current global
   * scale exactly (visual no-op). See `themeToCssVars` in
   * `src/themes/index.ts`.
   */
  typography?: ThemeTypography
  /**
   * PDP photo gallery configuration (`product-image-gallery` — the hero +
   * thumbnail-strip gallery on the product page). Optional at every level;
   * absent fields fall back to today's live behavior (`cover`), so an
   * absent `gallery` block is a visual no-op. The background color behind
   * the gallery images is NOT here — it's `surfaces.gallery_image_background`
   * (a color token, same primitive-or-hex convention as the rest of that
   * tier), consistent with colors living in `surfaces` everywhere else.
   */
  gallery?: {
    /**
     * `object-fit` for the MAIN hero image — applies only to the DB
     * ("original") product photos; the configurator/API-photo hero already
     * always renders `contain` today and is intentionally left hardcoded
     * (unaffected by this token). Rendered as the `--gallery-main-fit` CSS
     * var (raw keyword, NOT a color — not run through `toChannels`) by
     * `themeToCssVars`, consumed via an arbitrary `object-fit` CSS property
     * with an inline `cover` fallback in `product-image-gallery`, because
     * Tailwind 3's `objectFit` core plugin is static and ignores
     * `theme.extend.objectFit` (unlike `borderRadius.button`/`.input`,
     * this can't be a normal `tailwind.config.js` token). Default when
     * absent: `"cover"` (today's live behavior).
     */
    mainImageFit?: "cover" | "contain"
    /**
     * `object-fit` for the side thumbnail cards (both the `<Image>` and
     * `<video>` thumbnail elements). Rendered as `--gallery-thumb-fit`,
     * same mechanism/rationale as `mainImageFit`. Default when absent:
     * `"cover"` (today's live behavior).
     */
    thumbnailFit?: "cover" | "contain"
  }
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
  /**
   * Demo mode — when `true`, certain destructive/real-world-effect controls
   * (currently: the fabric-palettes PDF download and "Check stock
   * availability" buttons) are disabled and show a toast instead of
   * performing their real action. See `account/fabric-palettes`.
   */
  demoMode: boolean
  /**
   * Per-brand pricelist (XLSX) export configuration — resolved by
   * `src/lib/util/pricelist-theme.ts` (the ONLY module on the pricelist
   * path that imports `activeTheme`/this type) into a plain settings
   * object consumed by `buildPricelistWorkbook`
   * (`src/lib/util/pricelist-workbook.ts`). Optional at every level: an
   * absent `pricelist` section, or any absent field within it, falls back
   * to that workbook's own pre-existing hardcoded constant — see
   * `resolveRenderConfig` in `pricelist-workbook.ts` for the exact default
   * per field, so an absent section (or a brand that hasn't set one) is a
   * visual no-op.
   *
   * Colors are DELIBERATELY not configured here — the group-header
   * fill/text and table border colors are instead resolved from the
   * `surfaces` tokens above (`top_menu_background`/`top_menu_foreground`/
   * `accent`) by `pricelist-theme.ts`, the same surface -> primitive-color
   * lookup precedent used elsewhere (e.g. the Konva configurator's
   * `configurator_card` token in `sofa-modules-drawer.tsx`) — this keeps
   * brand colors defined in exactly one place (`surfaces`) rather than
   * duplicated into a second, pricelist-specific color block.
   */
  pricelist?: {
    rounding?: {
      /**
       * Decimal places for PRICE columns' displayed numFmt. Default 0
       * (today's whole-number display, e.g. "184" not "184.00"). Never
       * applied to the M³ column, which always keeps 2 decimal places
       * regardless of this setting.
       */
      prices?: number
      /**
       * Decimal places for the `W:/D:/H:` dimension line in the
       * DESCRIPTION column. Default 1 (today's 0.1cm precision).
       */
      dimensions?: number
    }
    /**
     * Whether each product sheet renders its own price-multiplier input
     * row (B9/C9). Default `true`. The Info sheet's own master multiplier
     * row is unaffected by this flag — see `resolveRenderConfig`'s doc
     * comment in `pricelist-workbook.ts`.
     */
    showMultiplierRow?: boolean
    /**
     * Whether the M³ (volume) column renders at all. Default `true`.
     * Setting this `false` shifts every price column one index earlier.
     */
    showVolumeColumn?: boolean
    /**
     * Cover/note copy — structure reserved for a future brand preset.
     * Currently accepted end-to-end (typed here, threaded through
     * `pricelist-theme.ts` and `PricelistWorkbookSettings`) but NOT YET
     * rendered by `buildPricelistWorkbook` — see that file's
     * `PricelistWorkbookSettings` doc comment for why.
     */
    copy?: {
      coverTitle?: string
      coverBody?: string
      productSheetNote?: string
    }
  }
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
   * `showCta` — when `false`, hides the hero CTA button (Login/Overview).
   */
  homepageHeader: { transparent: boolean; showCta: boolean }
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
  /** Per-brand visibility for the category pill on B2BProductCard (category-product-card). */
  productCard: { showCategory: boolean }
  /** Footer links; each link is hidden when its value is absent/empty. */
  footer?: {
    variant?: "full" | "compact" // defaults to "full" when omitted
    facebook?: string
    twitter?: string
    instagram?: string
    pinterest?: string
    linkedin?: string
    footer_support_email?: string // rendered as a mailto: link
    footer_privacy_url?: string
  }
}
