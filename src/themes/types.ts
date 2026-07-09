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
}
