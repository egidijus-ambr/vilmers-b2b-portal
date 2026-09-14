import { activeTheme } from "themes"
import type { Theme } from "themes/types"
import type { PricelistWorkbookSettings } from "@lib/util/pricelist-workbook"

/**
 * Bridges the build-time theme registry (`src/themes`) to
 * `buildPricelistWorkbook`'s (`src/lib/util/pricelist-workbook.ts`)
 * OPTIONAL settings parameter. This is the ONLY module on the pricelist
 * export path that imports `themes`/`activeTheme` — `pricelist-workbook.ts`
 * itself deliberately does not, for two reasons:
 *
 * 1. `themes/index.ts` THROWS at module load time when `NEXT_PUBLIC_THEME`
 *    doesn't match a registered brand — importing it from
 *    `pricelist-workbook.ts` would make every consumer of that file
 *    (including ones that have no reason to care about brand theming)
 *    depend on that env var being set correctly.
 * 2. Five existing verification harnesses (see
 *    `pricelist-workbook.ts`'s own `PricelistWorkbookSettings` doc comment)
 *    import `buildPricelistWorkbook` directly with no theme env var set at
 *    all, and must keep working unmodified.
 *
 * `src/app/api/pricelist/export/route.ts` (the real, live caller) is the
 * one place that imports BOTH this module and `buildPricelistWorkbook`,
 * wiring the two together.
 */

// Discriminates a real `#RRGGBB` hex color from everything else. Mirrors
// `themes/index.ts`'s own `HEX_COLOR_RE`, but is NOT the same guard reused
// from there: that constant is a DISCRIMINATOR only applied to
// `theme.colors` (a non-hex value there is returned unchanged, with no
// warning, by `toChannels`) — it is never applied to `theme.surfaces`, and
// four live surface-reachable tokens today are `rgba(...)` strings
// (`divider`, `image-overlay`, `white-20`, `white-80`), not `#RRGGBB` hex.
// A `surfaces.accent`/`top_menu_background`/`top_menu_foreground` override
// that (directly or via a `colors` primitive) resolves to one of those
// would, if passed through unchecked, get "FF" prefixed onto a literal
// `rgba(...)` string and emitted as a malformed ARGB. This file validates
// independently and falls back to `undefined` (i.e. `pricelist-workbook.ts`
// applies ITS OWN hardcoded default) rather than emit that.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

/**
 * Resolves one `surfaces` token to an 8-digit ARGB string (e.g.
 * `"FF23394D"`), following the same surface -> `colors` primitive -> raw-hex
 * fallback precedent as
 * `src/modules/products/components/configurator/sofa-modules-drawer.tsx:16-22`
 * (`activeTheme.colors[activeTheme.surfaces.configurator_card] ??
 * activeTheme.surfaces.configurator_card`). Returns `undefined` (not a
 * malformed value) when the resolved value isn't a valid `#RRGGBB` hex —
 * see the `HEX_COLOR_RE` doc comment above for why that check is needed
 * even though `surfaces.accent`/`top_menu_background`/`top_menu_foreground`
 * are `#RRGGBB` hex for both brands today.
 */
function resolveSurfaceArgb(
  theme: Theme,
  surfaceValue: string | undefined
): string | undefined {
  if (!surfaceValue) return undefined
  const hex = theme.colors[surfaceValue] ?? surfaceValue
  if (!HEX_COLOR_RE.test(hex)) return undefined
  // Uppercase before emitting — source hex casing is inconsistent across
  // brand files (e.g. dominari.ts's `gold: "#d1aa66"` is lowercase while
  // vilmers.ts's tokens are uppercase).
  return "FF" + hex.slice(1).toUpperCase()
}

/**
 * Resolves `theme.pricelist` + 3 `surfaces` tokens into a plain
 * `PricelistWorkbookSettings` object ready to pass as
 * `buildPricelistWorkbook`'s 5th argument.
 *
 * `theme` defaults to the build's `activeTheme` — the only value
 * `src/app/api/pricelist/export/route.ts` (the real caller) ever passes.
 * The parameter exists so this function stays UNIT TESTABLE without a
 * `NEXT_PUBLIC_THEME` build: a test can pass a synthetic `Theme` (e.g. one
 * whose `surfaces.accent` points at an `rgba(...)` token) to exercise the
 * hex-validation fallback in `resolveSurfaceArgb` above, which no real
 * brand preset currently triggers.
 *
 * Colors resolved here (see `resolveSurfaceArgb`):
 *   - group header fill  <- surfaces.top_menu_background
 *   - group header text  <- surfaces.top_menu_foreground
 *   - table border        <- surfaces.accent
 */
export function resolvePricelistWorkbookSettings(
  theme: Theme = activeTheme
): PricelistWorkbookSettings {
  return {
    rounding: theme.pricelist?.rounding,
    showMultiplierRow: theme.pricelist?.showMultiplierRow,
    showVolumeColumn: theme.pricelist?.showVolumeColumn,
    colors: {
      groupHeaderFill: resolveSurfaceArgb(
        theme,
        theme.surfaces.top_menu_background
      ),
      groupHeaderText: resolveSurfaceArgb(
        theme,
        theme.surfaces.top_menu_foreground
      ),
      border: resolveSurfaceArgb(theme, theme.surfaces.accent),
    },
    copy: theme.pricelist?.copy,
  }
}
