import { Montserrat } from "next/font/google"
import { activeThemeName } from "./index"

/**
 * Per-brand `next/font` loaders. `next/font/google` loaders require static,
 * literal arguments, so each brand font must be declared as its own const
 * here (not generated dynamically) and registered below by theme name.
 *
 * All loaders share the single `--font-brand` CSS variable — only the
 * selected brand's loader is ever applied (via `brandFont.variable`), so
 * exactly one font is active at a time despite multiple loaders existing
 * in the bundle.
 *
 * Adding a brand font = (1) add a `next/font` loader here (its own const,
 * static literal args), (2) add a `fontsByTheme[<theme name>]` entry
 * pointing at it. Montserrat remains the default/fallback for `vilmers`.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand",
})

const fontsByTheme: Record<string, typeof montserrat> = {
  vilmers: montserrat,
  // dominari currently copies Vilmers' colors/surfaces/radius (see
  // src/themes/dominari.ts) — reuse the same Montserrat loader instance
  // rather than declaring a second, identical `next/font` loader. Both keys
  // point at the same loader; only one theme (hence one font) is active per
  // build.
  dominari: montserrat,
}

/**
 * The active brand's font, selected by `NEXT_PUBLIC_THEME`. Fails fast if the
 * resolved theme is a REGISTERED theme (present in `themes`, see
 * `src/themes/index.ts`) but has no `fontsByTheme` entry — silently falling
 * back to Montserrat for a registered-but-unmapped brand would ship the
 * wrong font without any signal. (Montserrat is only used directly as the
 * `vilmers` mapping, not as an implicit fallback for other themes.)
 */
function resolveBrandFont(): typeof montserrat {
  const font = fontsByTheme[activeThemeName]
  if (!font) {
    throw new Error(
      `Theme "${activeThemeName}" is registered in src/themes/index.ts but has no ` +
        `matching entry in fontsByTheme (src/themes/fonts.ts). Add a next/font ` +
        `loader + a fontsByTheme["${activeThemeName}"] entry.`
    )
  }
  return font
}

export const brandFont = resolveBrandFont()
