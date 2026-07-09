import type { Theme } from "./types"
import { vilmers } from "./vilmers"
import { dominari } from "./dominari"

/**
 * Theme registry. New brands: add a preset file (copy `vilmers.ts`) and
 * register it here under its own key.
 */
export const themes: Record<string, Theme> = {
  vilmers,
  dominari,
}

/**
 * Invariant: one deployment = one brand = one store. `NEXT_PUBLIC_THEME`
 * MUST match the store this build's `.env` points at — because the theme is
 * frozen at build time (build-per-brand), serving a different store from the
 * same build would render one brand's palette under another brand's logo.
 */
function resolveActiveThemeName(): string {
  const requested = process.env.NEXT_PUBLIC_THEME || "vilmers"

  if (!(requested in themes)) {
    throw new Error(
      `Unknown NEXT_PUBLIC_THEME "${requested}". Available themes: ${Object.keys(
        themes
      ).join(", ")}. NEXT_PUBLIC_THEME must match the store this build is deployed for.`
    )
  }

  return requested
}

export const activeThemeName = resolveActiveThemeName()
export const activeTheme: Theme = themes[activeThemeName]

/**
 * Fail-fast guard (same place/style as the unknown-`NEXT_PUBLIC_THEME` throw
 * above): a language switcher assigned to the top bar while the top bar is
 * hidden would render nowhere — that's a contradiction in the preset, not a
 * state to silently drop or auto-relocate the switcher out of.
 */
if (
  activeTheme.layout.languageSwitcher.placement === "top-bar" &&
  !activeTheme.layout.topBar.show
) {
  throw new Error(
    `Invalid layout config for theme "${activeTheme.name}": ` +
      `languageSwitcher.placement is "top-bar" but topBar.show is false. ` +
      `The language switcher would have nowhere to render. Either set ` +
      `topBar.show to true, or move languageSwitcher.placement to "navbar".`
  )
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/

/**
 * Converts a `#RRGGBB` hex color to space-separated RGB channels (e.g.
 * `"#9A8555"` -> `"154 133 85"`) for Tailwind's channel-based color form
 * (`rgb(var(--color-x) / <alpha-value>)`). Non-hex values (e.g. pre-existing
 * `rgba(...)`/`rgb(...)` tokens) are returned unchanged — they are emitted
 * as full values and referenced via a bare `var(--color-*)` in
 * `tailwind.config.js` (never combined with an opacity modifier).
 */
function toChannels(value: string): string {
  const match = HEX_COLOR_RE.exec(value)
  if (!match) {
    return value
  }
  const hex = match[1]
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/**
 * Renders the theme's color tokens as a `:root { --color-<name>: <value>; }`
 * CSS string, one custom property per color token, followed by the Layer 4
 * semantic surface tokens (`--<token-kebab>: …`). Color tokens only — this
 * intentionally does NOT emit `--font-brand`; that variable is owned by
 * `next/font` (see `src/themes/fonts.ts`) and emitting it here too would
 * conflict.
 *
 * Hex (`#RRGGBB`) color values are emitted as space-separated RGB **channels**
 * (e.g. `--color-gold: 154 133 85;`) rather than the full hex string, because
 * `tailwind.config.js` wraps primitive/semantic tokens as
 * `rgb(var(--color-x) / <alpha-value>)` so Tailwind's opacity modifiers
 * (`bg-gold/10`, `text-white/80`, `hover:bg-accent/90`, …) work — a bare
 * `var(--color-x)` full-color reference silently drops the alpha modifier.
 * Non-hex values (the pre-existing `rgba(...)` tokens: `divider`,
 * `image-overlay`, `white-20`, `white-80`) are passed through unchanged; they
 * are referenced as bare `var(--color-*)` in the config and never used with
 * an opacity modifier (an `rgba(...)` value inside the `rgb(... / a)` wrapper
 * would be invalid CSS).
 *
 * Order matters: primitives are emitted first so the semantic tokens' own
 * `var(--color-*)` references resolve correctly. The semantic surface block
 * below is unaffected by the channel conversion — surfaces inherit whatever
 * form (channels or full value) their referenced primitive uses.
 *
 * A final, separate branch emits the `layout` block's PIXEL values as raw
 * (unitless-free, i.e. `<n>px`) CSS variables — deliberately NOT run through
 * `toChannels`/the `rgb(var() / <alpha-value>)` wrapper used for colors,
 * since these aren't colors and Tailwind consumes them directly via
 * arbitrary values (`h-[var(--nav-height)]`).
 */
export function themeToCssVars(theme: Theme): string {
  const colorDeclarations = Object.entries(theme.colors)
    .map(([token, value]) => `  --color-${token}: ${toChannels(value)};`)
    .join("\n")

  const surfaceDeclarations = Object.entries(theme.surfaces)
    .map(([token, value]) => {
      // Semantic keys are snake_case (e.g. "top_menu_background"); the CSS
      // var / Tailwind token are kebab-case (e.g. "top-menu-background").
      const cssVarName = token.replace(/_/g, "-")
      const isPrimitiveRef = Object.prototype.hasOwnProperty.call(
        theme.colors,
        value
      )
      const resolvedValue = isPrimitiveRef ? `var(--color-${value})` : value
      return `  --${cssVarName}: ${resolvedValue};`
    })
    .join("\n")

  const { topBar, logo } = theme.layout
  const navHeight = logo.height + 2 * logo.paddingY
  const navLogoHeightMobile = logo.heightMobile ?? logo.height
  const topBarHeight = topBar.show ? 32 : 0

  const layoutDeclarations = [
    `  --nav-logo-height: ${logo.height}px;`,
    `  --nav-logo-height-mobile: ${navLogoHeightMobile}px;`,
    `  --nav-height: ${navHeight}px;`,
    `  --top-bar-height: ${topBarHeight}px;`,
  ].join("\n")

  return `:root {\n${colorDeclarations}\n${surfaceDeclarations}\n${layoutDeclarations}\n}`
}
