import ExcelJS from "exceljs"
import type {
  PricelistExportProduct,
  PricelistExportSofaForm,
  PricelistExportAdvancedProduct,
  PricelistExportComponentAssociation,
  PricelistExportComponentGroup,
  PricelistExportComponent,
  PricelistExportPriceRow,
  PricelistExportCategoryRef,
  PricelistExportCategoryParentRef,
} from "@lib/furnisystems-sdk/modules/products/types"
import type { PricelistImage } from "./image-resize"

const INVALID_SHEET_NAME_CHARS = /[\[\]:*?/\\]/g
const MAX_SHEET_NAME_LENGTH = 31

/**
 * Excel worksheet names must be <=31 chars, unique within the workbook
 * (ExcelJS/Excel enforce this CASE-INSENSITIVELY — "Sofa Alpha" and
 * "SOFA ALPHA" collide), and free of `[ ] : * ? / \`. With up to ~277
 * products, truncating long names to 31 chars makes collisions near-certain,
 * so this sanitises, truncates, and de-duplicates with a numeric suffix
 * (e.g. "Long Product Name (2)").
 *
 * `usedKeys` is mutated — pass the same Set across calls for one workbook.
 * It stores LOWERCASED dedupe keys (do not "simplify" this to store the
 * original-cased name — that reintroduces the case-collision bug), while
 * the returned name keeps its original casing for readability.
 */
export function safeSheetName(rawName: string, usedKeys: Set<string>): string {
  const sanitized =
    (rawName || "Sheet").replace(INVALID_SHEET_NAME_CHARS, "").trim() ||
    "Sheet"
  // `.trim()` above runs BEFORE this slice, so truncation can reintroduce a
  // trailing space (e.g. "AAAA X" truncated mid-word). Excel silently trims
  // trailing/leading whitespace from sheet names on its own, which would
  // otherwise let a truncated name collide with an unrelated exact match
  // without ExcelJS ever throwing — trim again after slicing to close that.
  const base = sanitized.slice(0, MAX_SHEET_NAME_LENGTH).trim() || "Sheet"

  if (!usedKeys.has(base.toLowerCase())) {
    usedKeys.add(base.toLowerCase())
    return base
  }

  let suffix = 2
  let candidate: string
  do {
    const suffixText = ` (${suffix})`
    candidate =
      base.slice(0, MAX_SHEET_NAME_LENGTH - suffixText.length).trim() +
      suffixText
    suffix += 1
  } while (usedKeys.has(candidate.toLowerCase()))

  usedKeys.add(candidate.toLowerCase())
  return candidate
}

/**
 * Escapes a sheet name for use as the target of a HYPERLINK() formula, e.g.
 * `HYPERLINK("#'<escaped>'!A1", ...)`. The escaped name sits inside TWO
 * nested quoting layers at once — a single-quoted Excel sheet reference
 * (`'...'!A1`) that is itself embedded in a double-quoted formula string
 * literal (`"#'...'!A1"`) — so BOTH characters need doubling here, not just
 * the apostrophe: an unescaped `"` would terminate the outer string literal
 * early and corrupt the formula, even though it never appears in a bare
 * sheet reference typed directly into Excel's UI.
 */
function escapeSheetNameForHyperlinkTarget(sheetName: string): string {
  return sheetName.replace(/'/g, "''").replace(/"/g, '""')
}

/**
 * Escapes text for use inside a double-quoted Excel formula string literal
 * (e.g. HYPERLINK's display-text argument) — a literal `"` must be doubled
 * or Excel misparses the formula. Unlike the sheet-name target above, this
 * text isn't also wrapped in single quotes, so only this one escape applies.
 */
function escapeFormulaStringLiteral(text: string): string {
  return text.replace(/"/g, '""')
}

export interface PricelistWorkbookMeta {
  companyName: string
  pricelistName: string
  generatedAt: Date
  currency: string
  // Export language, e.g. "en"/"de"/"fr" — drives category-heading name
  // resolution (see resolveCategoryName) and the Uncategorized bucket's
  // label (see resolveUncategorizedLabel). Optional and defaults to "en" so
  // every pre-existing caller (this file's own verification harnesses, any
  // meta object built before this field existed) still typechecks.
  language?: string
}

// Sentinel `group_number` reserving exactly one price column, labeled
// "PRICE" (see GROUP_LABELS below), for the edge case where a workbook's
// combined `sortedGroupNumbers` pool (computed once, from every admitted
// product's fabric-category prices — see buildPricelistWorkbook) is EMPTY:
// every admitted product is flat-priced only (e.g. an OTHER/OTHER_WITH_FABRICS
// batch with no per-fabric-category pricing anywhere). Without this, zero
// price columns would exist and flat prices would silently never render —
// writeComponentDataRow's flat-price branch only ever writes at
// `sortedGroupNumbers[0]`. Real DB `group_number`s are always positive (see
// GROUP_LABELS's doc comment on the values actually seen), so -1 can never
// collide with one.
const PRICE_ONLY_GROUP_NUMBER = -1

/**
 * Fabric-price-category `group_number` -> the label its price column shows
 * in row GROUP_HEADER_ROW. Verified against the DB — labels are NOT
 * uniformly "CATn" (11/12 are leather grades, not categories). Anything not
 * listed here (e.g. groups 6, 7, 10, 14 seen on some assigned pricelists)
 * falls back to `CAT${n}` via getGroupLabel below. To add/rename a label,
 * edit ONLY this constant — no other label logic exists in this file.
 *
 * `PRICE_ONLY_GROUP_NUMBER`'s entry is the one exception to "real DB
 * group_number": see that constant's own doc comment just above.
 */
export const GROUP_LABELS: Record<number, string> = {
  1: "CAT1",
  2: "CAT2",
  3: "CAT3",
  4: "CAT4",
  5: "CAT5",
  11: "Leather A",
  12: "Leather B",
  [PRICE_ONLY_GROUP_NUMBER]: "PRICE",
}

function getGroupLabel(groupNumber: number): string {
  return GROUP_LABELS[groupNumber] ?? `CAT${groupNumber}`
}

// Price cells display as whole numbers (no cents) — "184", not "184.00".
// Deliberately display-only: the underlying cell `value`/`formula` (see
// writeDataRow/writeComponentDataRow) is untouched, so Excel still computes
// on the exact value; only the rendered text is rounded via numFmt.
const PRICE_NUMBER_FORMAT = "0"
// M³ volumes (e.g. 0.97) and the price-multiplier cells (e.g. 1.15) both
// need real decimal precision preserved in the DISPLAY, unlike prices above
// — do NOT point these at PRICE_NUMBER_FORMAT, "0" would silently round 0.97
// to 1 (M³) or visually hide that C9 is still multiplying by 1.15, not 1.
const VOLUME_NUMBER_FORMAT = "0.00"

// AdvancedProductType members this file distinguishes between (see
// PricelistExportAdvancedProduct.advanced_product_type and
// ProductsModule.getSofaPricelistExportProducts's admission-where doc
// comment for the full enum). Every other member is never admitted by that
// method's `where`, so a product reaching this file is always one of these
// three.
const ADVANCED_PRODUCT_TYPE_SOFA = "SOFA"
const ADVANCED_PRODUCT_TYPE_OTHER_WITH_FABRICS = "OTHER_WITH_FABRICS"
const ADVANCED_PRODUCT_TYPE_OTHER = "OTHER"

// Codes of the AdditionalComponentGroup holding a component-priced
// product's size/model variants — the analogue of a sofa module here.
// OTHER_WITH_FABRICS products (e.g. chairs — code
// "55-BICHON-L110X0/L090X0/L075X0") use "model"; OTHER products (e.g. coffee
// tables) use the separate "model-other" group instead. Mirrors
// src/configurator/lib/vilmers.ts's `MODEL_CODE`/`MODEL_CODE_OTHER`
// constants, used by getConfigString's own OTHER_WITH_FABRICS/OTHER
// branches to pick these same groups by exact code match — re-declared here
// (not imported) because that module's import graph pulls in the
// Konva-based configurator context, which has no place in a server-side
// XLSX builder.
const MODEL_GROUP_CODE = "model"
const MODEL_GROUP_CODE_OTHER = "model-other"

/**
 * The "model" analogue's AdditionalComponentGroup.code for a given
 * advanced_product_type — see MODEL_GROUP_CODE/MODEL_GROUP_CODE_OTHER's
 * doc comment. Every call site that used to compare a group's code
 * directly against the `MODEL_GROUP_CODE` constant now goes through this
 * function instead, so OTHER's "model-other" group gets the same
 * no-section-label, priced-first treatment OTHER_WITH_FABRICS's "model"
 * group already had.
 */
function modelGroupCodeFor(
  advancedProductType: PricelistExportAdvancedProduct["advanced_product_type"]
): string {
  return advancedProductType === ADVANCED_PRODUCT_TYPE_OTHER
    ? MODEL_GROUP_CODE_OTHER
    : MODEL_GROUP_CODE
}

// Row height (points) for an OTHER_WITH_FABRICS/OTHER component row that has
// NO embedded photo. These rows never carry a blueprint thumbnail (that's a
// sofa-module-only concept), but a component CAN carry its own photo (see
// COMPONENT_PHOTO_BOX / writeComponentDataRow's embed block) — when one
// is actually embedded the row is bumped up to DATA_ROW_HEIGHT instead (same
// height a sofa module row uses for its blueprint), decided per-row from
// whether a buffer was actually fetched, never from URL presence alone (a
// component with an image404 placeholder, a failed fetch, or a
// budget-rejected photo must still get the shorter, image-less height). 30pt
// was this table's own row height before ANY image existed in this column at
// all ("Raised 30 -> 110, later halved to 55" below, of DATA_ROW_HEIGHT).
const COMPONENT_DATA_ROW_HEIGHT = 30

// Row height (points) for an OTHER_WITH_FABRICS/OTHER group section-label
// row — shorter than COMPONENT_DATA_ROW_HEIGHT since it holds one line of
// bold text, not wrapped description/price cells. Set explicitly rather
// than left at Excel's own default (~15pt), matching this file's
// convention of every other row (photo, sofa module, component) setting
// its own height rather than relying on an implicit one.
const SECTION_LABEL_ROW_HEIGHT = 18

// Fixed leading columns on every PRODUCT sheet: PICTURE, DESCRIPTION,
// ART.CODE, M³. Price columns (one per distinct group_number, see
// getSortedGroupNumbers below) start immediately after at
// FIXED_COLUMN_COUNT + 1.
const FIXED_COLUMN_COUNT = 4
const PICTURE_COL = 1
const DESCRIPTION_COL = 2
const ART_CODE_COL = 3
const M3_COL = 4
// PICTURE (1st) widened 12 -> 25 to fit a legible module-blueprint thumbnail
// (see the blueprint-embedding block in writeDataRow below) — was sized only
// for the placeholder text before any image existed in that column. Halved
// 25 -> 12.5 once the picture cell itself was shrunk to stop reserving a
// huge, mostly-empty column around a proportionally-scaled thumbnail (see
// DATA_ROW_HEIGHT/BLUEPRINT_MARGIN_PX below for the matching row-height and
// margin cuts).
const COLUMN_WIDTHS = [12.5, 34, 18, 10] // matches FIXED_COLUMN_COUNT; ART.CODE (3rd) widened 12 -> 14.4 (x1.2) to fit codes like "1-ALVAR-B1201", then 14.4 -> 18 (x1.25); PICTURE (1st) halved 25 -> 12.5, see comment above
// Price columns no longer need to fit ".00" (see PRICE_NUMBER_FORMAT above),
// so this is narrowed ~13.6% from 11 -> 9.5 — NOT a flat 9: ExcelJS's own
// DEFAULT_COLUMN_WIDTH is also 9, and node_modules/exceljs/lib/doc/column.js
// computes `isCustomWidth = width !== undefined && width !== DEFAULT_COLUMN_WIDTH`.
// A width of exactly 9 makes isCustomWidth false, so Column.toModel() skips
// the column and NO <col> element is written to the .xlsx at all — Excel
// then renders it at its own built-in default width instead of the intended
// one, silently undoing this whole narrowing. (Verified against a real
// generated workbook, a minimal exceljs repro, and the library source —
// don't "simplify" this back to 9.) 9.5 sidesteps that trap while still
// fitting the digit-width character-capacity model this file already uses
// for column sizing (see columnWidthToPx above; capacity in "0"-digit-width
// slots ≈ floor(width)): floor(9.5) = 9, matching the 9 characters in
// "Leather A"/"Leather B" (GROUP_LABELS' widest labels, rendered bold via
// GROUP_HEADER_FONT), with a bit of headroom over floor(9)'s zero slack to
// absorb the bold weight. The max DB price (3641, 4 digits) plus the $C$9
// multiplier (still only 5-6 digits after a realistic multiplier) fits with
// room to spare.
const GROUP_COLUMN_WIDTH = 9.5

// Excel column width (character units) -> approximate pixel width, using the
// standard Calibri-11 "max digit width" model Excel itself uses to lay out
// columns (MDW=7px, +5px padding). Excel's real formula rounds through an
// intermediate 256ths-of-MDW step, but this codebase doesn't need pixel-
// perfect column boundaries — just a close estimate to size an image that
// visibly fits inside the cell with margin to spare.
function columnWidthToPx(width: number): number {
  return Math.round(width * 7 + 5)
}

// Excel row height (points) -> pixels. ExcelJS's own `ext: {width, height}`
// image sizing is documented as "at 96dpi" (see its README), i.e. 1pt =
// 96/72 = 4/3 px — the same ratio this uses.
function rowHeightToPx(heightPt: number): number {
  return Math.round((heightPt * 4) / 3)
}

// OOXML EMU-per-pixel conversion factor (English Metric Units — the unit
// `<xdr:colOff>`/`<xdr:rowOff>` are defined in; 9,525 EMU = 1px at 96dpi).
// Hoisted to module scope (was two identical local consts, one in
// writeDataRow's blueprint embed, one in writeComponentDataRow's photo
// embed) so addCenteredPictureCellImage below is the ONE place both embed
// call sites get this from — see that function's doc comment for the native-
// EMU anchor technique this feeds.
const EMU_PER_PX = 9525

// Column A pixel width, computed once. Hoisted up here (rather than living
// next to the blueprint-sizing constants that were its original motivation
// — see BLUEPRINT_USABLE_WIDTH_PX below) because PHOTO_SIZE_PX also needs it
// and PHOTO_SIZE_PX is declared before DATA_ROW_HEIGHT exists, so this must
// sit above both use sites.
const PICTURE_COLUMN_PX = columnWidthToPx(COLUMN_WIDTHS[0])

// Rounds a module/component dimension to `decimals` decimal places (default
// ONE, i.e. 0.1cm) for the DESCRIPTION column's `W:/D:/H:` line (see
// writeDataRow and getComponentDescription below, the two places that build
// that line). `decimals` is threaded from PricelistWorkbookSettings'
// `rounding.dimensions` (see RenderConfig.dimensionDecimals) — the default
// parameter value below exists only so this function's historical
// behaviour is preserved for any caller that omits it, not as a second
// source of truth for the setting's default (that default lives in
// resolveRenderConfig).
// ERP-sourced Dimension rows carry ordinary IEEE-754 floating-point noise on
// some real, currently-priced modules/components (e.g. 56.99999999999999
// instead of a clean 57, or 339.0000000000001 instead of 339 — verified
// against local data: 22 such values, on live SofaForm/AdditionalComponent
// rows with real price rows in multiple active pricelists, not just demo
// data). Rounding to one decimal place still collapses this noise cleanly —
// it's many orders of magnitude below the 0.05cm rounding threshold — while
// no longer misstating the real, non-noise fractional values below.
//
// Deliberately NOT whole-centimetre rounding: a small number of REAL
// half-centimetre dimensions exist in local data — e.g. 55-NECKREST-N035X0
// at 62.5cm and 55-NECKREST-N038X0 at 3.5cm — plus at least one other real
// fractional value (113.4cm), and whole-cm rounding would misstate all of
// them to a customer. 0.1cm precision preserves these exactly while still
// collapsing float noise.
//
// Returns a NUMBER, not a fixed-decimal string: a clean integer like 57
// therefore stringifies as "57" (no trailing ".0") when interpolated into
// the dims line below, while a genuine fraction like 62.5 survives intact.
//
// `null`/`undefined` pass through as the literal em-dash the two callers
// already use for a missing dimension — only the NUMBER formatting changes
// here, never whether a dimension is shown at all (a real 0 still rounds to
// 0 and is shown, matching the existing blank-vs-0 convention elsewhere in
// this file).
function formatDimensionCm(
  value: number | null | undefined,
  decimals: number = 1
): number | string {
  if (value == null) return "—"
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Reserved block at the top of every PRODUCT sheet (not the Info sheet) for
// the category photo. The two-tier header lives at TOP_HEADER_ROW /
// GROUP_HEADER_ROW and module data starts at DATA_START_ROW.
const PHOTO_ROW_COUNT = 10
const PHOTO_ROW_HEIGHT = 18 // an anchored image doesn't create row height on its own
const TOP_HEADER_ROW = PHOTO_ROW_COUNT + 1 // 11: PICTURE / DESCRIPTION / ART.CODE / M³ / "PRICE (EUR)"
const GROUP_HEADER_ROW = TOP_HEADER_ROW + 1 // 12: "MODULES" / (blank) / per-group labels
const DATA_START_ROW = GROUP_HEADER_ROW + 1 // 13
// Raised 30 -> 110 to fit a legible module-blueprint thumbnail (see the
// blueprint-embedding block in writeDataRow below). wrapText alone doesn't
// grow a row once the column width is fixed, and 30pt (40px) was never
// enough for a 1px/cm image of anything but the smallest modules — measured
// real modules run roughly 44-410px on their longer side (see
// BLUEPRINT_USABLE_HEIGHT_PX below for the height side of that trade-off).
// Halved 110 -> 55 once COLUMN_WIDTHS[0] (PICTURE) and BLUEPRINT_MARGIN_PX
// were also cut: the old 110pt row left a lot of empty space around even a
// full-scale thumbnail. 55pt still comfortably fits DESCRIPTION_COL's
// wrapped `name\nW: {w}cm D: {d}cm H: {h}cm` text at that column's 34-char
// width and Calibri 11 (the sheet's unstyled default font): the dims line
// alone (~26 chars, e.g. "W: 245cm D: 245cm H: 245cm") fits on one wrapped
// line, and even a long product/module name wrapping onto 2 lines is only 3
// wrapped lines total — at Calibri 11's ~13.2pt line height that's ~40-45pt
// including cell padding, comfortably under 55pt. A 4th wrapped line would
// be tight; this was not hit by any real product/module name sampled.
const DATA_ROW_HEIGHT = 55
// 10 rows * 18pt ≈ 240px — the PHOTO_ROW_COUNT/PHOTO_ROW_HEIGHT band this
// image sits in is taller than PHOTO_SIZE_PX needs, see this change's report
// for the resulting dead-space measurement (deliberately not acted on here).
// Width == height because src_facebook is a square (1080x1080) crop — a
// range anchor (e.g. addImage(id, "A1:F10")) would stretch it to fill a
// wide, short range and visibly distort it, so this uses a fixed-size
// oneCellAnchor instead (see addImage call below).
//
// Shrunk 180 -> derived from PICTURE_COLUMN_PX: this was left at a stale 180
// when COLUMN_WIDTHS[0] (PICTURE) was halved 25 -> 12.5 for the per-module
// blueprint thumbnails (see that constant's own comment), which made this
// fixed-size anchor extend past column A (~93px) into column B for photo
// rows 1-8. Now sized to leave a trailing margin — PHOTO_MARGIN_PX, same
// value and float-anchor rationale as BLUEPRINT_MARGIN_PX below
// (oneCellAnchor images float above the grid and are never clipped to their
// cell, so a real gap is needed even when the image is nominally "column
// width sized") — rather than hardcoding the ~93px column width directly.
// The `* 2` mirrors BLUEPRINT_USABLE_WIDTH_PX's centered two-sided math
// below, but this anchor is NOT centered (`tl: {col: 0, row: 0}`, see the
// addImage call in buildPricelistWorkbook) — the full 2x margin ends up as
// slack on the right/bottom edges only, not split evenly on all four sides.
const PHOTO_MARGIN_PX = 4
// Exported so pricelist-photos.ts can derive its pre-embed resize target
// (2x this, for a retina-sharp source at the same on-screen size — see that
// file's own doc comment) from the SAME constant this file anchors the
// image at, rather than a second, independently-maintained magic number.
export const PHOTO_SIZE_PX = PICTURE_COLUMN_PX - PHOTO_MARGIN_PX * 2

// Per-module blueprint thumbnail sizing (column A on a DATA row, as opposed
// to the category-photo block above which occupies column A on the PHOTO
// rows). Deliberately NOT a fixed box like PHOTO_SIZE_PX: blueprints are
// rendered at a fixed 1px/cm and the whole point of embedding them is that
// their PIXEL size stays proportional to real module size across a sheet
// (see buildPricelistWorkbook's blueprint doc comment) — fitting each one
// independently into a fixed box would destroy that. Instead this defines
// the MAXIMUM box available (cell size minus a real margin so the image
// never touches — let alone crosses — the cell border into column B's
// wrapped description text), and the actual per-image size is
// `thumb_width/thumb_height * scale`, where `scale` is computed ONCE per
// sheet from the largest module on it (see computeBlueprintScale below) and
// capped at 1 so a tiny module is never upscaled into a blur.
//
// Margin exists because ExcelJS/OOXML `oneCellAnchor` images FLOAT above the
// grid — they are never clipped to their cell, unlike text. Without a real
// gap here, an image sized exactly to the column/row would visibly touch
// (or, once its long side is the wider one, cross into) column B's wrapped
// description text. 10px was picked as a visibly-clear margin, not derived
// from any specific Excel padding constant, and confirmed empirically at
// that value: every drawn image's right/bottom edge stayed inside its
// column/row bounds (checked against a generated sample workbook's raw
// drawing XML — 0 bound violations at the time).
//
// Cut 10 -> 4 once COLUMN_WIDTHS[0]/DATA_ROW_HEIGHT were halved: a fixed
// 10px margin would otherwise eat a much bigger SHARE of the now-smaller
// cell (10px of a ~93x73px cell vs. 10px of the old ~180x147px one), working
// against the point of shrinking the cell — this is the "tighten the margin
// so the image nearly fills the cell" half of that change. Still non-zero
// for the same float-anchor reason above; NOT re-verified against a freshly
// generated workbook's raw XML at this new value — re-run that check (see
// the note above for how) before treating 4px as similarly proven.
const BLUEPRINT_MARGIN_PX = 4
// Data-row pixel height, computed once — reused both for the usable-box
// constants below AND for the centering math in writeDataRow. The matching
// column-width conversion (PICTURE_COLUMN_PX) is hoisted up near
// columnWidthToPx instead of living here — see that constant's own comment
// for why.
const DATA_ROW_PX = rowHeightToPx(DATA_ROW_HEIGHT)
const BLUEPRINT_USABLE_WIDTH_PX = PICTURE_COLUMN_PX - BLUEPRINT_MARGIN_PX * 2
const BLUEPRINT_USABLE_HEIGHT_PX = DATA_ROW_PX - BLUEPRINT_MARGIN_PX * 2

// Component-photo box (writeComponentDataRow's embed, distinct from both the
// category-photo block above and the blueprint sizing just above). UNLIKE
// the category photo (a fixed SQUARE box), this is the full picture CELL
// minus margin on both axes — width from the column, height from the row —
// because a component's `src_facebook` is a product shot on a large
// white/light background with the item itself often occupying only a
// fraction of the frame (verified against a real user report: an ~1080x1080
// photo with a ~20px item). Trimming that background before resizing (see
// pricelist-component-photos.ts's `TRIM_THRESHOLD`) can turn a wide, short,
// or tall product into a genuinely non-square image — filling the whole
// available cell, rather than a fixed square that leaves the item small
// inside its own box AGAIN, is the fix for that.
//
// Both dimensions still leave the same PHOTO_MARGIN_PX gap on every edge —
// oneCellAnchor images float above the grid and are never clipped to their
// cell (see BLUEPRINT_MARGIN_PX's doc comment) — so this is
// `PICTURE_COLUMN_PX - 2*margin` wide and `DATA_ROW_PX - 2*margin` tall.
// (An earlier version of this feature used a single square sized off
// whichever axis was smaller — i.e. always 65x65 — before component photos
// were trimmed; that fixed-square design is what this rectangular box
// replaces.)
//
// Exported for the same reason as PHOTO_SIZE_PX above — pricelist-component-
// photos.ts derives its resize target (2x this box, per axis) from here
// instead of a second pair of magic numbers.
export const COMPONENT_PHOTO_BOX = {
  width: PICTURE_COLUMN_PX - PHOTO_MARGIN_PX * 2,
  height: DATA_ROW_PX - PHOTO_MARGIN_PX * 2,
}

/** A pixel box — square for the category photo, width!=height for the component photo (see COMPONENT_PHOTO_BOX). */
interface PhotoBox {
  width: number
  height: number
}

/**
 * Fits `width`x`height` inside `box`, preserving aspect ratio (same "fit
 * inside" semantics as sharp's own `fit: "inside"`, applied a second time
 * here at DISPLAY time — see PricelistImage's doc comment for why: the
 * fetch pools resize to 2x a box constant, per axis, for a retina-sharp
 * source, so an image whose aspect ratio already matches `box` naturally
 * fits it exactly via this function with no special-casing, while a
 * different aspect ratio still fits inside on its longer-relative-to-`box`
 * side instead of being stretched to fill it).
 *
 * Deliberately NOT capped at scale<=1 the way computeBlueprintScale caps its
 * scale: a blueprint's whole point is representing a REAL physical
 * dimension proportionally, so upscaling past its native pixel size would
 * misrepresent that. A category/component photo has no such physical
 * meaning — it's a decorative thumbnail meant to fill its box — so this
 * intentionally scales UP just as readily as down.
 *
 * Guards `width`/`height` <= 0 (also catches NaN, since every `> 0`
 * comparison against NaN is false) by falling back to the SQUARE that fits
 * inside `box` (i.e. sized off `box`'s shorter axis) rather than computing a
 * scale — `box.width / 0` is `Infinity`, and `Math.round(0 * Infinity)` is
 * `NaN`, which would otherwise reach ExcelJS's `ext` and corrupt the
 * generated .xlsx. Not expected to trigger on real data (sharp's own resize
 * output is never 0x0), but this is a cheap, load-bearing backstop against a
 * malformed `PricelistImage` ever reaching this far. Same square this
 * function computes for a genuinely square source image, so this is
 * indistinguishable from "a square photo happened to fit exactly" rather
 * than a visibly different failure mode.
 */
function fitInsideBox(
  width: number,
  height: number,
  box: PhotoBox
): { width: number; height: number } {
  if (!(width > 0 && height > 0)) {
    const squareSize = Math.min(box.width, box.height)
    return { width: squareSize, height: squareSize }
  }
  const scale = Math.min(box.width / width, box.height / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Resolves the `{width, height}` an embedded photo's `ext` should use inside
 * `box`: `entry.width`/`height` when known (see PricelistImage —
 * resizeForEmbed populated these from sharp's own resize output, using the
 * SAME `box` scaled 2x as the resize target — see
 * pricelist-photos.ts/pricelist-component-photos.ts's `RESIZE_MAX_*`), else
 * the square that fits inside `box` — the exact pre-resize fallback
 * behaviour (a 1080x1080 `src_facebook` fit inside a non-square
 * `COMPONENT_PHOTO_BOX` comes out to a centered square sized off the box's
 * shorter axis, same as before component photos had a `width`/`height` to
 * read at all), for the "sharp unavailable/resize failed, embedding the
 * original buffer" case.
 */
function resolvePhotoExt(
  entry: PricelistImage,
  box: PhotoBox
): { width: number; height: number } {
  if (entry.width == null || entry.height == null) {
    const squareSize = Math.min(box.width, box.height)
    return { width: squareSize, height: squareSize }
  }
  return fitInsideBox(entry.width, entry.height, box)
}

const BORDER_COLOR = "FF7F6000"
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
}
const CENTER_MIDDLE_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  vertical: "middle",
  horizontal: "center",
}
const TOP_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFFFF" },
}
const TOP_HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FF000000" },
}
// `fgColor` is ExcelJS's BACKGROUND colour for a solid pattern fill, not the
// foreground/text colour — do not "fix" this to bgColor.
const GROUP_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF23394D" },
}
const GROUP_HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
}

// Applied to the Info sheet's index product-name cells only, so they read as
// clickable links even though the click target is a HYPERLINK() formula, not
// a native ExcelJS hyperlink (see the index-building loop below for why).
const INDEX_LINK_FONT: Partial<ExcelJS.Font> = {
  color: { argb: "FF0563C1" },
  underline: true,
}

// Per-sheet price-multiplier input. Row 9 sits inside the photo band
// (PHOTO_ROW_COUNT = 10) but below the actual image: rows 1-10 are
// PHOTO_ROW_HEIGHT (18pt = 24px) each, so row 9 starts at 192px cumulative.
// The oneCellAnchor photo (PHOTO_SIZE_PX, now derived from
// PICTURE_COLUMN_PX — see that constant's own comment) is well under that
// regardless of the column width it's sized against, so row 9 stays clear.
// See writeMultiplierCell below.
const MULTIPLIER_ROW = 9
const MULTIPLIER_LABEL_COL = 2 // B
const MULTIPLIER_VALUE_COL = 3 // C
const MULTIPLIER_LABEL_FONT: Partial<ExcelJS.Font> = { bold: true }
// Deliberately NOT the FF7F6000 table border/fill used by THIN_BORDER and
// the header rows above — this must read as an editable input, not as part
// of the module table.
const MULTIPLIER_INPUT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF2CC" },
}
const MULTIPLIER_INPUT_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF999999" } },
  left: { style: "thin", color: { argb: "FF999999" } },
  bottom: { style: "thin", color: { argb: "FF999999" } },
  right: { style: "thin", color: { argb: "FF999999" } },
}

/**
 * Per-brand pricelist rendering settings — resolved by
 * `src/lib/util/pricelist-theme.ts` from the active build-time theme
 * (`src/themes`) and passed into `buildPricelistWorkbook` as an OPTIONAL
 * 5th argument. Every field is optional and independently defaulted (see
 * `resolveRenderConfig` below) to TODAY's hardcoded constant, so an absent
 * settings object — or one missing some fields — reproduces the exact
 * pre-existing output byte-for-byte.
 *
 * This file deliberately does NOT import `src/themes` itself, and this is
 * the only theme-shaped type it knows about: `themes/index.ts` throws at
 * MODULE LOAD TIME on an unknown `NEXT_PUBLIC_THEME`, and this file's own
 * verification harnesses (and `src/app/api/pricelist/export/route.ts`'s
 * unit-testable core) call `buildPricelistWorkbook` directly, several with
 * no theme env var set at all — an import here would break every one of
 * them. `pricelist-theme.ts` is the one-way bridge: it imports `themes`
 * and hands this file a plain, pre-resolved object.
 *
 * Colors are pre-resolved 8-digit ARGB strings (e.g. `"FF23394D"`),
 * already validated as `^#[0-9a-fA-F]{6}$`-sourced hex by the caller
 * (`pricelist-theme.ts`) before conversion — this file applies them as-is
 * with no further validation.
 */
export interface PricelistWorkbookSettings {
  rounding?: {
    /** Decimal places for PRICE columns' numFmt. Default 0 (today's "0"). Never applied to the M³ column — see VOLUME_NUMBER_FORMAT, which stays "0.00" regardless. */
    prices?: number
    /** Decimal places for the `W:/D:/H:` dimension line in DESCRIPTION. Default 1, matching formatDimensionCm's historical 0.1cm precision. */
    dimensions?: number
  }
  /** Whether each product sheet renders its own B9/C9 price-multiplier input row. Default true. The Info sheet's master multiplier row is unaffected by this flag — see resolveRenderConfig's doc comment. */
  showMultiplierRow?: boolean
  /** Whether the M³ (volume) column renders at all. Default true. Setting this false shifts every price column one index earlier — see resolveRenderConfig. */
  showVolumeColumn?: boolean
  colors?: {
    /** GROUP_HEADER_ROW fill. Default "FF23394D" (GROUP_HEADER_FILL). */
    groupHeaderFill?: string
    /** GROUP_HEADER_ROW text. Default "FFFFFFFF" (GROUP_HEADER_FONT.color). */
    groupHeaderText?: string
    /** Table border color. Default "FF7F6000" (BORDER_COLOR/THIN_BORDER). */
    border?: string
  }
  /**
   * Cover/note copy — accepted and typed for forward-compatibility with a
   * future brand preset, but NOT YET rendered anywhere in this file:
   * neither `vilmers.ts` nor `dominari.ts` sets any `copy` text today, so
   * rendering it would be dead code. Rendering `coverTitle`/`coverBody`
   * would also require INSERTING rows on the Info sheet — safe only via
   * `addRow` calls made BEFORE the master multiplier row is added (the
   * multiplier row number is captured from that call's own return value,
   * see `masterMultiplierRow` below, so anything added earlier via
   * `addRow` is self-correcting); inserting rows AFTER the fact via
   * `spliceRows`/`insertRow` would NOT be safe, since every product
   * sheet's `Info!$B$5`-style formula string is already baked in as a
   * literal row number by the time such a splice could run.
   */
  copy?: {
    coverTitle?: string
    coverBody?: string
    productSheetNote?: string
  }
}

// Converts a PRICE-column decimal-place count (settings.rounding.prices)
// into an ExcelJS numFmt string. 0 (default) -> "0", reproducing
// PRICE_NUMBER_FORMAT exactly; 2 -> "0.00"; 3 -> "0.000". Deliberately
// never used for M³ — see VOLUME_NUMBER_FORMAT, which resolveRenderConfig
// never threads this value into.
function priceNumberFormat(decimals: number): string {
  return decimals <= 0 ? "0" : `0.${"0".repeat(decimals)}`
}

// Builds a THIN_BORDER-shaped border object for an arbitrary ARGB color —
// used both for the default (BORDER_COLOR, reproducing THIN_BORDER exactly)
// and for a brand-supplied override.
function buildThinBorder(argb: string): Partial<ExcelJS.Borders> {
  return {
    top: { style: "thin", color: { argb } },
    left: { style: "thin", color: { argb } },
    bottom: { style: "thin", color: { argb } },
    right: { style: "thin", color: { argb } },
  }
}

/**
 * Fully-resolved rendering config threaded through every sheet-writing
 * function below, replacing direct references to the module-level defaults
 * (PRICE_NUMBER_FORMAT, FIXED_COLUMN_COUNT, THIN_BORDER, ...) so a brand's
 * settings (or their absence) flow through ONE object built once per
 * workbook, rather than being re-read ad hoc at each call site.
 */
interface RenderConfig {
  priceNumFmt: string
  dimensionDecimals: number
  showMultiplierRow: boolean
  showVolumeColumn: boolean
  /** FIXED_COLUMN_COUNT (4) when showVolumeColumn, FIXED_COLUMN_COUNT - 1 (3) when not — see writeHeaderRows/writeDataRow for how this shifts price-column indices left by one. Column C (ART.CODE, index 3) is unaffected either way, so the C9 multiplier cell (MULTIPLIER_VALUE_COL, an independent constant) never moves. */
  fixedColumnCount: number
  /** Matches fixedColumnCount in length. */
  columnWidths: number[]
  groupHeaderFill: ExcelJS.Fill
  groupHeaderFont: Partial<ExcelJS.Font>
  thinBorder: Partial<ExcelJS.Borders>
}

/**
 * Resolves a (possibly absent/partial) PricelistWorkbookSettings into a
 * RenderConfig, defaulting every field to TODAY's hardcoded constant.
 * `resolveRenderConfig(undefined)` is byte-identical to this file's
 * pre-existing behaviour BY CONSTRUCTION — every default below IS the
 * pre-existing constant (PRICE_NUMBER_FORMAT, FIXED_COLUMN_COUNT,
 * COLUMN_WIDTHS, GROUP_HEADER_FILL/FONT, BORDER_COLOR), not a re-derived
 * approximation of it.
 *
 * `showMultiplierRow` only gates the PER-SHEET B9/C9 input written by
 * `writeMultiplierCell` (see its call site in `buildPricelistWorkbook`) —
 * the Info sheet's own master multiplier row
 * (`addRow(["Price multiplier", 1])`, captured as `masterMultiplierRow`)
 * is always written regardless, since it is workbook metadata, not a
 * per-product convenience control. Every sheet's price formula keeps
 * hardcoding `$C$9` either way (see writeDataRow's doc comment on that
 * constraint) — when the per-sheet row is hidden, C9 stays genuinely
 * blank and the formula's own `N($C$9)>0` guard falls back to a 1x
 * multiplier, exactly as it does today for a manually cleared C9.
 */
function resolveRenderConfig(settings?: PricelistWorkbookSettings): RenderConfig {
  const priceDecimals = settings?.rounding?.prices ?? 0
  const dimensionDecimals = settings?.rounding?.dimensions ?? 1
  const showMultiplierRow = settings?.showMultiplierRow ?? true
  const showVolumeColumn = settings?.showVolumeColumn ?? true
  const borderArgb = settings?.colors?.border ?? BORDER_COLOR

  return {
    priceNumFmt: priceNumberFormat(priceDecimals),
    dimensionDecimals,
    showMultiplierRow,
    showVolumeColumn,
    fixedColumnCount: showVolumeColumn
      ? FIXED_COLUMN_COUNT
      : FIXED_COLUMN_COUNT - 1,
    columnWidths: showVolumeColumn
      ? COLUMN_WIDTHS
      : COLUMN_WIDTHS.slice(0, 3),
    groupHeaderFill: settings?.colors?.groupHeaderFill
      ? {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: settings.colors.groupHeaderFill },
        }
      : GROUP_HEADER_FILL,
    groupHeaderFont: settings?.colors?.groupHeaderText
      ? { bold: true, color: { argb: settings.colors.groupHeaderText } }
      : GROUP_HEADER_FONT,
    thinBorder: buildThinBorder(borderArgb),
  }
}

/**
 * Writes the two-tier header (TOP_HEADER_ROW + GROUP_HEADER_ROW) for one
 * product sheet. `sortedGroupNumbers` is guaranteed non-empty in practice —
 * buildPricelistWorkbook's own empty-pool guard (PRICE_ONLY_GROUP_NUMBER)
 * reserves at least one column even when nothing in the whole batch carries
 * a real fabric-category price — but nothing at the type level enforces
 * that here, so a literal empty array is still handled defensively: no
 * price columns and no "PRICE (EUR)" merge at all, just the four fixed
 * columns.
 *
 * Merge ranges are only ever 2+ cells: a single price column (count === 1)
 * gets its "PRICE (EUR)" text written directly into that one cell instead of
 * being merged — ExcelJS happily emits a 1x1 `mergeCell`, which Excel itself
 * then rejects, so this sidesteps that rather than relying on mergeCells to
 * cope with a degenerate range.
 *
 * Every cell in a merged range is valued/styled BEFORE the merge call, and
 * every cell in the header (including ones that stay blank, like D12 or a
 * zero-price-column sheet's row 11 past M³) is touched via getCell so it
 * gets the same border/fill as its neighbours — an untouched cell has no
 * border and reads as a rendering bug, not an intentionally reserved column.
 */
function writeHeaderRows(
  sheet: ExcelJS.Worksheet,
  sortedGroupNumbers: number[],
  cfg: RenderConfig
): void {
  const priceColCount = sortedGroupNumbers.length
  const lastCol = cfg.fixedColumnCount + priceColCount

  const topRow = sheet.getRow(TOP_HEADER_ROW)
  const groupRow = sheet.getRow(GROUP_HEADER_ROW)

  topRow.getCell(PICTURE_COL).value = "PICTURE"
  topRow.getCell(DESCRIPTION_COL).value = "DESCRIPTION"
  topRow.getCell(ART_CODE_COL).value = "ART.CODE"
  if (cfg.showVolumeColumn) {
    topRow.getCell(M3_COL).value = "M³"
  }
  if (priceColCount >= 1) {
    topRow.getCell(cfg.fixedColumnCount + 1).value = "PRICE (EUR)"
  }

  groupRow.getCell(1).value = "MODULES"
  sortedGroupNumbers.forEach((groupNumber, i) => {
    groupRow.getCell(cfg.fixedColumnCount + 1 + i).value = getGroupLabel(
      groupNumber
    )
  })

  for (let col = 1; col <= lastCol; col++) {
    const topCell = topRow.getCell(col)
    topCell.border = cfg.thinBorder
    topCell.fill = TOP_HEADER_FILL
    topCell.font = TOP_HEADER_FONT
    topCell.alignment = CENTER_MIDDLE_ALIGNMENT

    const groupCell = groupRow.getCell(col)
    groupCell.border = cfg.thinBorder
    groupCell.fill = cfg.groupHeaderFill
    groupCell.font = cfg.groupHeaderFont
    groupCell.alignment = CENTER_MIDDLE_ALIGNMENT
  }

  // "MODULES" always spans the 3 module-identity columns (PICTURE/
  // DESCRIPTION/ART.CODE) regardless of price column count OR
  // cfg.showVolumeColumn — M³, when shown, is its own 4th fixed column and
  // was never part of this merge. The "PRICE (EUR)" merge only happens for
  // 2+ price columns (see doc comment above).
  sheet.mergeCells(GROUP_HEADER_ROW, 1, GROUP_HEADER_ROW, 3)
  if (priceColCount >= 2) {
    sheet.mergeCells(
      TOP_HEADER_ROW,
      cfg.fixedColumnCount + 1,
      TOP_HEADER_ROW,
      lastCol
    )
  }
}

/**
 * Writes the per-sheet multiplier input at B9/C9 (see MULTIPLIER_ROW's doc
 * comment above for why row 9 is clear of the photo). C9 defaults to a
 * FORMULA pointing at the Info sheet's master multiplier cell
 * (`masterMultiplierRow`, captured from that cell's own `addRow()` return
 * value — never hardcoded) rather than a literal 1, so editing the master
 * cascades to every sheet that hasn't been overridden. Typing a plain number
 * directly into C9 still overrides just this sheet, because every price
 * formula on the sheet reads C9's current value regardless of what produced
 * it (see the formula built in writeDataRow below).
 */
function writeMultiplierCell(
  sheet: ExcelJS.Worksheet,
  masterMultiplierRow: number
): void {
  const row = sheet.getRow(MULTIPLIER_ROW)

  const labelCell = row.getCell(MULTIPLIER_LABEL_COL)
  labelCell.value = "Price multiplier"
  labelCell.font = MULTIPLIER_LABEL_FONT

  const valueCell = row.getCell(MULTIPLIER_VALUE_COL)
  valueCell.value = {
    formula: `Info!$B$${masterMultiplierRow}`,
    result: 1,
  }
  valueCell.fill = MULTIPLIER_INPUT_FILL
  valueCell.border = MULTIPLIER_INPUT_BORDER
  valueCell.alignment = CENTER_MIDDLE_ALIGNMENT
}

/**
 * Per-sheet context for embedding blueprint thumbnails into column A of
 * each data row — see BLUEPRINT_USABLE_WIDTH_PX/HEIGHT_PX and
 * computeBlueprintScale's doc comments above/below for the sizing rationale.
 * Threaded through as one object (rather than four extra parameters) since
 * `scale` is fixed for the whole sheet and `workbook`/`buffers`/`idByUrl`
 * are shared across every row on it.
 */
interface BlueprintEmbedContext {
  workbook: ExcelJS.Workbook
  /** url -> already-fetched, already-validated PNG bytes (or null/absent). */
  buffers: Map<string, Buffer | null>
  /** Dedupes embedded images by URL, same pattern as imageIdByUrl below. */
  idByUrl: Map<string, number>
  /** Pre-computed once per sheet by computeBlueprintScale; already <= 1. */
  scale: number
}

/**
 * Centres an already-sized `ext` image inside column A (PICTURE_COL) of
 * `rowNumber`, using a NATIVE-EMU `tl` anchor rather than exceljs's own
 * documented fractional col/row anchor.
 *
 * IMPORTANT, verified against exceljs@4.4.0 source (lib/doc/anchor.js): the
 * fractional `tl.col`/`tl.row` feature (see exceljs's README, "Add image to
 * a cell") does NOT do what the docs imply once a column has a CUSTOM
 * width, like this sheet's PICTURE column. `Anchor#col`'s setter computes
 * `nativeColOff = fraction * colWidth`, where `colWidth` for a custom width
 * is `Math.floor(width * 10000)` — e.g. 250,000 for our width-25 column —
 * and that raw number is then written VERBATIM as the XML `<xdr:colOff>`,
 * which OOXML defines as EMU (see EMU_PER_PX above). 250,000 EMU is only
 * ~26px, nowhere near this column's real rendered width (~180px) — so a
 * "0.5 = centre" fraction would place the image at roughly the 13px mark,
 * badly left-biased, not centred. (Confirmed by unzipping a generated
 * workbook and reading the raw XML.)
 *
 * Sidestepping the bug entirely: `Anchor`'s constructor also accepts a
 * NATIVE address (`{nativeCol, nativeColOff, nativeRow, nativeRowOff}`),
 * which it stores and later serialises AS-IS with no unit conversion — see
 * exceljs's own `IAnchor`/`CellPositionXform`. Supplying real EMU offsets
 * there (computed from OUR OWN, correct px math, via EMU_PER_PX) is exact
 * and independent of exceljs's width*10000 approximation. `ImagePosition`'s
 * public .d.ts only advertises `{col, row}` for `tl` (not the native
 * fields), so this needs `as any` — a genuine upstream typing gap, same as
 * the Buffer cast on every `addImage` call in this file, not a type-safety
 * workaround.
 *
 * Scope of the bug: only affects fractional offsets on a CUSTOM-width
 * column/row. `Anchor`'s DEFAULT-width fallback (`colWidth = 640000` when
 * `isCustomWidth` is false) happens to roughly match Excel's real default
 * column width in EMU, which is almost certainly why this went unnoticed
 * upstream. It also does not affect the category-photo anchor in
 * buildPricelistWorkbook (`tl: {col: 0, row: 0}`) — an INTEGER anchor has no
 * fractional part to mis-convert.
 *
 * Shared by writeDataRow's blueprint embed and writeComponentDataRow's photo
 * embed — the two were, before this extraction, two copies of the exact
 * same centering math (only `ext` differed), which is what this function
 * closes off from drifting apart.
 */
function addCenteredPictureCellImage(
  sheet: ExcelJS.Worksheet,
  imageId: number,
  rowNumber: number,
  ext: { width: number; height: number }
): void {
  const colOffsetPx = Math.max(0, (PICTURE_COLUMN_PX - ext.width) / 2)
  const rowOffsetPx = Math.max(0, (DATA_ROW_PX - ext.height) / 2)

  sheet.addImage(imageId, {
    tl: {
      nativeCol: PICTURE_COL - 1,
      nativeColOff: Math.round(colOffsetPx * EMU_PER_PX),
      nativeRow: rowNumber - 1,
      nativeRowOff: Math.round(rowOffsetPx * EMU_PER_PX),
    } as any,
    ext,
  })
}

/**
 * Writes one module's data row. `dimensions.length` on the SDK type IS the
 * depth (there is no separate `depth` field) — do not go looking for one.
 */
function writeDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  form: PricelistExportSofaForm,
  sortedGroupNumbers: number[],
  blueprintCtx: BlueprintEmbedContext,
  cfg: RenderConfig
): void {
  const row = sheet.getRow(rowNumber)
  // Set before sheet.addImage below. The image anchor itself is positioned
  // via NATIVE EMU offsets (see the blueprint-embedding block further down)
  // computed from the DATA_ROW_HEIGHT constant directly, not from this row
  // object — but the row still needs its real height set for Excel to
  // actually render it at DATA_ROW_HEIGHT pt in the first place, and doing
  // that before any per-row work keeps one consistent rule ("row height is
  // set first") rather than a special case for whether this particular row
  // ends up getting an image.
  row.height = DATA_ROW_HEIGHT

  // Exactly one manufacturer exists in the data today, so at most one
  // FormPriceFabricCategory row can match a given (module, group_number,
  // pricelist) combination — this pivot collapses cleanly with no
  // aggregation needed. `priceByGroup` still takes the max of any colliding
  // rows rather than picking one arbitrarily, so a second manufacturer
  // wouldn't silently corrupt prices if one is ever added.
  const priceByGroup = new Map<number, number>()
  for (const priceRow of form.form_price_fabric_category) {
    const groupNumber = priceRow.fabrice_price_category.group_number
    const existing = priceByGroup.get(groupNumber)
    if (existing === undefined || priceRow.price > existing) {
      priceByGroup.set(groupNumber, priceRow.price)
    }
  }

  // Sum package volumes for the module (a module can map to multiple
  // packages) — leave the cell blank rather than 0 when no package has a
  // volume recorded, so a missing measurement isn't misread as "zero".
  let volume: number | null = null
  for (const pkg of form.package_dimensions) {
    if (typeof pkg.volume === "number") {
      volume = (volume ?? 0) + pkg.volume
    }
  }

  const width = form.dimensions?.width ?? null
  const length = form.dimensions?.length ?? null // `length` on Dimension IS depth
  const height = form.dimensions?.height ?? null
  // Nullish, not falsy — a real 0 dimension must survive (same rule as the
  // blank-vs-0 price/volume handling above).
  const hasAnyDimension = width != null || length != null || height != null

  const name = form.name ?? ""
  let description = name
  if (hasAnyDimension) {
    const w = formatDimensionCm(width, cfg.dimensionDecimals)
    const d = formatDimensionCm(length, cfg.dimensionDecimals)
    const h = formatDimensionCm(height, cfg.dimensionDecimals)
    const dimsLine = `W: ${w}cm D: ${d}cm H: ${h}cm`
    // `name` can itself be null/"" — guard the separator so a nameless
    // module doesn't get a leading blank line above its dimensions.
    description = name ? `${name}\n${dimsLine}` : dimsLine
  }

  row.getCell(DESCRIPTION_COL).value = description
  row.getCell(DESCRIPTION_COL).alignment = {
    wrapText: true,
    vertical: "middle",
    horizontal: "left",
  }

  row.getCell(ART_CODE_COL).value = form.code ?? ""
  row.getCell(ART_CODE_COL).alignment = CENTER_MIDDLE_ALIGNMENT

  if (cfg.showVolumeColumn) {
    row.getCell(M3_COL).value = volume
    row.getCell(M3_COL).numFmt = VOLUME_NUMBER_FORMAT
    row.getCell(M3_COL).alignment = CENTER_MIDDLE_ALIGNMENT
  }

  sortedGroupNumbers.forEach((groupNumber, i) => {
    const cell = row.getCell(cfg.fixedColumnCount + 1 + i)
    const price = priceByGroup.get(groupNumber)
    // `price !== undefined` (not `?? null`/falsy) so a module with NO price
    // for this group stays a genuinely EMPTY cell (no formula — `=*IF(...)`
    // would be invalid, and a formula evaluating to 0 is not the same as
    // "not priced"), while a module with a REAL price of 0 still gets one.
    if (price !== undefined) {
      cell.value = {
        // Multiplies the base price by the per-sheet multiplier at $C$9.
        // Guard is `N($C$9)>0`, NOT `$C$9=""`: C9 normally holds a FORMULA
        // referencing the Info-sheet master (see writeMultiplierCell), so a
        // cleared master evaluates C9 to 0, not "" — an `=""` test would miss
        // that and every price would silently become 0.00. `N()` coerces
        // blank/text/junk/0 alike, so this single guard also covers a
        // cleared C9 or garbage typed into it, falling back to a 1x
        // multiplier in all of those cases. Do not "simplify" this to `=""`.
        formula: `${price}*IF(N($C$9)>0,$C$9,1)`,
        result: price,
      }
    }
    cell.numFmt = cfg.priceNumFmt
    cell.alignment = CENTER_MIDDLE_ALIGNMENT
  })

  // Column A (PICTURE): embeds this module's blueprint thumbnail when one is
  // available; stays genuinely blank otherwise (no fetch/validation failure,
  // no missing blueprint, and no budget rejection is ever an error — see
  // pricelist-blueprints.ts). `getCell(PICTURE_COL)` is still touched via the
  // border loop below either way, so an image-less cell reads as an
  // intentionally reserved column, not a rendering bug — same reasoning
  // covers any blank price cell when a module has no price in a given group.
  const blueprint = form.blueprint
  const blueprintUrl = blueprint?.thumbnail_url ?? null
  const blueprintBuffer = blueprintUrl
    ? blueprintCtx.buffers.get(blueprintUrl)
    : null
  const thumbWidth = blueprint?.thumb_width ?? 0
  const thumbHeight = blueprint?.thumb_height ?? 0
  if (blueprintUrl && blueprintBuffer && thumbWidth > 0 && thumbHeight > 0) {
    let imageId = blueprintCtx.idByUrl.get(blueprintUrl)
    if (imageId === undefined) {
      imageId = blueprintCtx.workbook.addImage({
        // Same upstream exceljs .d.ts quirk as the category-photo embed
        // below — see that call's comment for why `as any` is correct here,
        // not a type-safety workaround.
        buffer: blueprintBuffer as any,
        extension: "png",
      })
      blueprintCtx.idByUrl.set(blueprintUrl, imageId)
    }

    // Scale is fixed for the whole sheet (see computeBlueprintScale) and
    // already capped at 1 — never upscale a small module past its real
    // pixel size, which would make it blurry AND falsely imply it's exactly
    // BLUEPRINT_USABLE_*_PX in real size.
    const imageWidth = Math.max(1, Math.round(thumbWidth * blueprintCtx.scale))
    const imageHeight = Math.max(
      1,
      Math.round(thumbHeight * blueprintCtx.scale)
    )

    // Centres the image in the cell — see addCenteredPictureCellImage's own
    // doc comment for the exceljs fractional-anchor bug this native-EMU
    // technique sidesteps (shared with writeComponentDataRow's photo embed).
    addCenteredPictureCellImage(sheet, imageId, rowNumber, {
      width: imageWidth,
      height: imageHeight,
    })
  }

  const lastCol = cfg.fixedColumnCount + sortedGroupNumbers.length
  for (let col = 1; col <= lastCol; col++) {
    row.getCell(col).border = cfg.thinBorder
  }
}

/**
 * Computes the single scale factor a sheet's module-blueprint thumbnails
 * should ALL be drawn at (see BlueprintEmbedContext / BLUEPRINT_USABLE_*_PX
 * above for why this must be one shared value, not a per-image fit — fitting
 * each thumbnail independently into the same box would make a 60cm module
 * and a 240cm module render at the same size, destroying the whole point of
 * a proportional 1px/cm render).
 *
 * Maxes over only the forms that will actually GET an image drawn — i.e.
 * have a usable blueprint reference AND a successfully fetched buffer in
 * `blueprintBuffers` — not every form in the GraphQL response. A module
 * whose fetch failed, or that fell past the embed budget (see
 * pricelist-blueprints.ts), must not shrink every other, successfully
 * embedded image on the sheet for a size the customer will never even see.
 *
 * Returns 1 (a safe, otherwise-unused default — nothing gets drawn when
 * this is 1 AND there was nothing to max over) when no form on the sheet
 * has an embeddable image at all.
 */
function computeBlueprintScale(
  forms: PricelistExportSofaForm[],
  blueprintBuffers: Map<string, Buffer | null>
): number {
  let maxThumbWidth = 0
  let maxThumbHeight = 0

  for (const form of forms) {
    const blueprint = form.blueprint
    const url = blueprint?.thumbnail_url
    if (!url || !blueprintBuffers.get(url)) continue

    const width = blueprint?.thumb_width ?? 0
    const height = blueprint?.thumb_height ?? 0
    if (width <= 0 || height <= 0) continue

    if (width > maxThumbWidth) maxThumbWidth = width
    if (height > maxThumbHeight) maxThumbHeight = height
  }

  if (maxThumbWidth <= 0 || maxThumbHeight <= 0) return 1

  // Capped at 1: never upscale, even if every module on the sheet is
  // smaller than the usable box — a small module really IS smaller, and
  // upscaling would both misrepresent that and look visibly blurry.
  return Math.min(
    1,
    BLUEPRINT_USABLE_WIDTH_PX / maxThumbWidth,
    BLUEPRINT_USABLE_HEIGHT_PX / maxThumbHeight
  )
}

// ===== OTHER_WITH_FABRICS / OTHER support =====
//
// Unlike a sofa (module geometry with a per-module price), an
// OTHER_WITH_FABRICS or OTHER product's priced items are additional
// components — see PricelistExportComponentAssociation. `buildComponentRows`
// below turns those into the SAME row shape a sofa module produces
// (description / artCode / volume / a per-CAT-column price), so
// writeHeaderRows, the global CAT-column pooling, and the price-multiplier
// formula all keep working unmodified; only the two small row-writing
// functions below differ from writeDataRow — a component never carries a
// blueprint thumbnail (that's a sofa-module-only concept), but DOES get its
// own component-photo embed (see ComponentPhotoEmbedContext/
// COMPONENT_PHOTO_BOX), which is why COMPONENT_DATA_ROW_HEIGHT is only
// the image-LESS row height, not a blanket "these rows never carry a
// picture" rule. The two types differ only in which group code is treated
// as the "model" group — see modelGroupCodeFor.

/** One row of an OTHER_WITH_FABRICS/OTHER sheet: either a group section label, or a priced component/base-price row. */
type ComponentSheetRow = ComponentSectionLabelRow | ComponentDataRow

interface ComponentSectionLabelRow {
  kind: "section"
  label: string
  /**
   * Whether any row belonging to this section was built with a non-null
   * `priceByGroup` (i.e. carries real per-fabric-category pricing), threaded
   * straight out of `buildComponentRows`'s own built `ComponentDataRow[]`
   * for the section rather than re-derived from the group's
   * `use_fabric_prices_for_components` flag. That distinction matters for
   * the "lowest group number" fallback in `buildComponentRows` (flag false,
   * no flat price recorded, but `price_fabric_category` rows present): that
   * case collapses to a single flat-looking price and must render as NOT
   * having category prices, even though the flag alone can't tell you that.
   * Drives whether `writeSectionLabelRow` repeats the CAT/Leather labels
   * across the price columns (mirroring GROUP_HEADER_ROW) or leaves them
   * blank for an all-flat-priced section (e.g. mattresses).
   */
  hasCategoryPrices: boolean
}

interface ComponentDataRow {
  kind: "data"
  description: string
  artCode: string
  volume: number | null
  // At most one of these is non-null. Which one is decided by the
  // component's group, NOT inferred from which price rows happen to be
  // present (see buildComponentRows): a group with
  // use_fabric_prices_for_components === false always resolves to
  // `flatPrice` (falling back to a collapsed price_fabric_category value —
  // see buildComponentRows's data-inconsistency comment — only when no flat
  // price was recorded), while every other group follows the legacy rule —
  // price_fabric_category if non-empty, ELSE a flat price — see
  // resolveComponentFlatPrice's doc comment. `priceByGroup` fills each CAT
  // column from its own matching group_number (blank where none matches);
  // `flatPrice` is written to the first price column only, leaving the
  // other category cells blank.
  priceByGroup: Map<number, number> | null
  flatPrice: number | null
  // The component's own src_facebook URL (see PricelistExportComponentImage),
  // or `null` when the component has no image at all. Threaded straight from
  // buildComponentDataRow rather than re-read from the association at embed
  // time, mirroring how every other field on this row is resolved once here.
  // A non-null URL is NOT a guarantee of an embedded picture — see
  // writeComponentDataRow's embed block for the fetch/validation/budget
  // checks that can still leave this row image-less.
  photoUrl: string | null
}

/**
 * Collapses a fabric-category price list into one price per group_number,
 * taking the max on a collision — same rule, and same "more than one
 * manufacturer would collide here" rationale, as writeDataRow's own
 * `priceByGroup` construction for sofa modules.
 */
function buildPriceByGroupMap(rows: PricelistExportPriceRow[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const row of rows) {
    const groupNumber = row.fabrice_price_category.group_number
    const existing = map.get(groupNumber)
    if (existing === undefined || row.price > existing) {
      map.set(groupNumber, row.price)
    }
  }
  return map
}

/**
 * Flat (non-fabric-category) price for one component association, or `null`
 * if it has none for this pricelist. Prefers `extra_prices[0].price` (the
 * query already filters this to the export's pricelist — see
 * GET_SOFA_PRICELIST_EXPORT_PRODUCTS) over the legacy `extra_price` scalar,
 * which is NOT pricelist-scoped; the scalar is only a last-resort fallback
 * for a component that hasn't been migrated to a per-pricelist row yet.
 * `extra_price`'s default is 0 (see the Prisma schema), which is what most
 * of a product's ~50+ components carry — a real 0 there means "no price",
 * not "priced at zero", so it's excluded (`> 0`), unlike a genuine
 * `extra_prices`/`price_fabric_category` row of 0, which IS a real price.
 */
function resolveComponentFlatPrice(
  assoc: PricelistExportComponentAssociation
): number | null {
  const listPrice = assoc.extra_prices[0]?.price
  if (typeof listPrice === "number") return listPrice
  if (assoc.extra_price > 0) return assoc.extra_price
  return null
}

/**
 * Component's own description, mirroring writeDataRow's
 * name-plus-dimensions convention for a sofa module: the profile name, with
 * a `W:/D:/H:` line appended only when the component actually has
 * dimensions recorded (most don't — size/model info for these products
 * usually lives in the component's CODE/name string itself, e.g.
 * "55-BICHON-L110X0", not in a separate Dimension row).
 *
 * Name fallback chain: profile name (language-filtered by the query) -> the
 * component's own code -> its SKU -> a synthetic `Component {id}` — a
 * missing profile (profiles default to `lt`; this export also runs in
 * en/fr/de) must never emit a row with a blank description.
 */
function getComponentDescription(
  component: PricelistExportComponent,
  dimensionDecimals: number
): string {
  const name =
    component.additional_component_profiles[0]?.name ??
    component.code ??
    component.component_sku ??
    `Component ${component.id}`

  const width = component.dimensions?.width ?? null
  const length = component.dimensions?.length ?? null // depth, same convention as SofaForm.dimensions
  const height = component.dimensions?.height ?? null
  const hasAnyDimension = width != null || length != null || height != null
  if (!hasAnyDimension) return name

  const w = formatDimensionCm(width, dimensionDecimals)
  const d = formatDimensionCm(length, dimensionDecimals)
  const h = formatDimensionCm(height, dimensionDecimals)
  return `${name}\nW: ${w}cm D: ${d}cm H: ${h}cm`
}

/** Group name fallback chain, same reasoning as getComponentDescription's. */
function getGroupName(group: PricelistExportComponentGroup): string {
  return (
    group.additional_component_group_profiles[0]?.name ??
    group.code ??
    `Group ${group.id}`
  )
}

/**
 * Orders the non-model groups on an OTHER_WITH_FABRICS/OTHER sheet: by
 * AdditionalComponentGroup.order (nulls last — both `order` and `code` are
 * nullable in the schema), then by code, then by id as a final deterministic
 * tie-break so sheet output doesn't vary run-to-run.
 */
function compareComponentGroups(
  a: PricelistExportComponentGroup,
  b: PricelistExportComponentGroup
): number {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB

  const codeA = a.code ?? ""
  const codeB = b.code ?? ""
  if (codeA !== codeB) return codeA < codeB ? -1 : 1

  return a.id - b.id
}

/** Builds one priced-component's data row (shared by the model group — see modelGroupCodeFor — and every other group's rows below). */
function buildComponentDataRow(
  assoc: PricelistExportComponentAssociation,
  priceByGroup: Map<number, number> | null,
  flatPrice: number | null,
  dimensionDecimals: number
): ComponentDataRow {
  const component = assoc.additional_component

  // Sum package volumes, same blank-vs-0 convention as writeDataRow's own
  // module volume: a component can map to multiple packages, and a missing
  // measurement must stay blank, not read as a real zero.
  let volume: number | null = null
  for (const pkg of component.package_dimensions) {
    if (typeof pkg.volume === "number") {
      volume = (volume ?? 0) + pkg.volume
    }
  }

  return {
    kind: "data",
    description: getComponentDescription(component, dimensionDecimals),
    artCode: component.code ?? component.component_sku ?? "",
    volume,
    priceByGroup,
    flatPrice,
    photoUrl: component.image?.src_facebook ?? null,
  }
}

/**
 * Resolves the set of AdditionalComponentGroup ids enabled for one product
 * from `additional_component_group_to_advanced_product` (see
 * ProductsModule.getSofaPricelistExportProducts's query doc comment).
 * Shared by both `buildComponentRows` (per-row filtering) and the
 * workbook-wide CAT-column pool (buildPricelistWorkbook), so the two never
 * disagree about which groups "count" for a product.
 *
 * Returns `null` ONLY when the field itself is `undefined` — the query
 * response didn't include it at all, a shape this file has never actually
 * seen but types defensively against — and that `null` means "unknown,
 * don't filter." Any array the field DOES return, INCLUDING an empty one,
 * becomes a real (possibly empty) `Set`, which callers then enforce as a
 * real filter. This mirrors use-configurator-data.ts's own
 * `groupAssociations.length > 0` gate on this exact same relation: an
 * empty array there dispatches NO component groups to the customer at all,
 * so an empty Set here must likewise filter out every component rather
 * than falling back to unfiltered — a product whose enabled-group links
 * genuinely come back empty is a product the live configurator would also
 * show nothing for.
 */
function resolveEnabledGroupIds(
  advancedProduct: PricelistExportAdvancedProduct
): Set<number> | null {
  const groupLinks =
    advancedProduct.additional_component_group_to_advanced_product
  if (groupLinks === undefined) return null
  return new Set(
    groupLinks.map((link) => link.additional_component_group.id)
  )
}

/**
 * Builds the OTHER_WITH_FABRICS/OTHER row list for one product: an optional
 * base row, then the model group's rows (the size/model variants — the
 * main priced items, analogous to sofa modules, so NOT preceded by a
 * section label; which group code counts as "model" depends on the
 * product's type — see `modelGroupCode`/modelGroupCodeFor), then every
 * other priced group's rows, each preceded by a section label row carrying
 * the group's name.
 *
 * Filters out any component with no price in this pricelist — a product has
 * ~50+ components across ~10 groups (threads-type, shooting, logos,
 * direction, market, threads-colors, design-comfort, model...) and most
 * carry no price at all; they're configuration metadata, not priced items
 * (see resolveComponentFlatPrice's doc comment on the `extra_price`-default
 * trap this guards against). A group with zero priced components after
 * filtering is dropped entirely — including its would-be section label,
 * since a label over nothing reads as a rendering bug.
 *
 * Also filters out any component whose GROUP is not itself enabled for
 * this product (`enabledGroupIds`, resolved by `resolveEnabledGroupIds`
 * from `additional_component_group_to_advanced_product` — see
 * ProductsModule.getSofaPricelistExportProducts's query doc comment) even
 * when the individual component association is `enabled: true`. This
 * mirrors use-configurator-data.ts's own `groupAssociations.length > 0`
 * gate on this exact same relation, which dispatches NO component groups
 * to the customer at all once that array comes back empty — see
 * `resolveEnabledGroupIds`'s doc comment for the `null` vs. empty-Set
 * distinction that makes this match. Also closes a real data gap: some
 * OTHER products carry stale, still-priced component associations in a
 * group whose product-level link is disabled (verified against local
 * data).
 */
function buildComponentRows(
  advancedProduct: PricelistExportAdvancedProduct,
  dimensionDecimals: number,
  modelGroupCode: string,
  enabledGroupIds: Set<number> | null
): ComponentSheetRow[] {
  const rows: ComponentSheetRow[] = []

  // Base row: a single fabric-category price at the ADVANCED PRODUCT level
  // (chairs/armchairs priced as one whole rather than per-module) — only
  // emitted when that array is non-empty (empirically empty for every local
  // OTHER_WITH_FABRICS/OTHER product today, but not assumed to stay that
  // way).
  if (advancedProduct.advanced_product_price_fabric_category.length > 0) {
    rows.push({
      kind: "data",
      description: "Base price",
      artCode: "",
      volume: null,
      priceByGroup: buildPriceByGroupMap(
        advancedProduct.advanced_product_price_fabric_category
      ),
      flatPrice: null,
      // The advanced-product level, not a single component — there's no
      // AdditionalComponent.image to read here at all.
      photoUrl: null,
    })
  }

  // Bucket enabled, PRICED component associations by their group id.
  // Unpriced associations (the majority — see this function's doc comment)
  // are dropped here, before grouping, so an all-unpriced group never makes
  // it into `groupsById` and therefore never gets a section label either.
  const groupsById = new Map<number, PricelistExportComponentGroup>()
  const pricedByGroupId = new Map<
    number,
    { assoc: PricelistExportComponentAssociation; priceByGroup: Map<number, number> | null; flatPrice: number | null }[]
  >()

  for (const assoc of advancedProduct.additional_component_to_advanced_product) {
    const component = assoc.additional_component
    const group = component?.additional_component_group
    if (!component || !group) continue
    // See this function's doc comment: a group can be linked-but-disabled
    // for this product even while its component associations are enabled.
    // `enabledGroupIds === null` (the field itself was `undefined`) skips
    // this filter entirely; a non-null Set — even an EMPTY one — is
    // enforced as-is (see resolveEnabledGroupIds).
    if (enabledGroupIds && !enabledGroupIds.has(group.id)) continue

    let priceByGroup: Map<number, number> | null = null
    let flatPrice: number | null = null

    if (group.use_fabric_prices_for_components === false) {
      // The group has opted OUT of per-fabric-category pricing (mirrors the
      // configurator's rule — see component-utils.ts:210's
      // `if (group.use_fabric_prices_for_components === false) return
      // hasExtraPrice`): whether a component shows one price or a price per
      // CAT column is a property of the GROUP, never inferred from which
      // price rows happen to be present. So price_fabric_category rows are
      // ignored here even when they exist, and the flat price is
      // authoritative.
      flatPrice = resolveComponentFlatPrice(assoc)

      if (flatPrice === null && assoc.price_fabric_category.length > 0) {
        // Data-inconsistency fallback: the group says "single price" but
        // this association has no flat price recorded, while
        // price_fabric_category rows DO exist. Rather than silently drop
        // the component from the pricelist, collapse those rows to one
        // value — the price of the lowest group_number present — so the
        // component still appears (as a single CAT1 price) instead of
        // vanishing.
        const byGroup = buildPriceByGroupMap(assoc.price_fabric_category)
        const lowestGroupNumber = Math.min(...Array.from(byGroup.keys()))
        flatPrice = byGroup.get(lowestGroupNumber) ?? null
      }
    } else if (assoc.price_fabric_category.length > 0) {
      priceByGroup = buildPriceByGroupMap(assoc.price_fabric_category)
    } else {
      flatPrice = resolveComponentFlatPrice(assoc)
    }

    if (priceByGroup === null && flatPrice === null) continue // unpriced — skip

    groupsById.set(group.id, group)
    const entries = pricedByGroupId.get(group.id) ?? []
    entries.push({ assoc, priceByGroup, flatPrice })
    pricedByGroupId.set(group.id, entries)
  }

  const modelGroup = Array.from(groupsById.values()).find(
    (group) => group.code === modelGroupCode
  )

  // `model` group first, WITHOUT a section label (see this function's doc
  // comment) — its rows are the main priced items.
  if (modelGroup) {
    for (const entry of pricedByGroupId.get(modelGroup.id) ?? []) {
      rows.push(
        buildComponentDataRow(
          entry.assoc,
          entry.priceByGroup,
          entry.flatPrice,
          dimensionDecimals
        )
      )
    }
  }

  // Every remaining priced group, each preceded by its own section label.
  const remainingGroups = Array.from(groupsById.values())
    .filter((group) => group.id !== modelGroup?.id)
    .sort(compareComponentGroups)

  for (const group of remainingGroups) {
    const entries = pricedByGroupId.get(group.id) ?? []
    if (entries.length === 0) continue // defensive — groupsById only ever holds priced groups

    const dataRows = entries.map((entry) =>
      buildComponentDataRow(
        entry.assoc,
        entry.priceByGroup,
        entry.flatPrice,
        dimensionDecimals
      )
    )
    // Threaded from the built rows themselves (not re-derived from the
    // group's `use_fabric_prices_for_components` flag) — see
    // ComponentSectionLabelRow.hasCategoryPrices's doc comment for why the
    // flag alone is insufficient (the lowest-group fallback case).
    const hasCategoryPrices = dataRows.some((row) => row.priceByGroup !== null)

    rows.push({
      kind: "section",
      label: getGroupName(group),
      hasCategoryPrices,
    })
    rows.push(...dataRows)
  }

  return rows
}

/**
 * Every distinct component-photo URL that will actually be embedded on an
 * OTHER/OTHER_WITH_FABRICS sheet — i.e. only priced, enabled-group
 * components (mirrors buildComponentRows's own filtering EXACTLY, since it
 * IS buildComponentRows: this calls it directly rather than re-deriving the
 * predicate). Used by pricelist-component-photos.ts's fetch pool so its
 * count/byte budget is only ever spent on a URL that could actually render —
 * duplicating buildComponentRows's priced-resolution branches (the
 * use_fabric_prices_for_components flag, the lowest-group-number fallback,
 * the extra_price>0 trap — see resolveComponentFlatPrice's doc comment) in a
 * second module risks the two silently drifting apart, which would surface
 * as blank PICTURE cells with no error, not a loud failure.
 *
 * `buildComponentRows` is pure and doesn't mutate `products`, so calling it
 * again here — once per product, same as buildPricelistWorkbook's own
 * per-product pass — is safe; its cost is trivial next to the hundreds of
 * HTTP fetches this feeds.
 *
 * `dimensionDecimals` only affects the formatted description TEXT
 * (getComponentDescription), never which components are priced — this
 * caller never reads `description`, so a fixed dummy value is passed rather
 * than threading a render setting into what's otherwise a pure data-fetch
 * helper.
 */
export function collectComponentPhotoUrls(
  products: PricelistExportProduct[]
): Set<string> {
  const urls = new Set<string>()
  const DUMMY_DIMENSION_DECIMALS = 1

  for (const product of products) {
    const advancedProduct = product.advanced_product
    if (!advancedProduct) continue

    const advancedProductType = advancedProduct.advanced_product_type
    const isComponentBased =
      advancedProductType === ADVANCED_PRODUCT_TYPE_OTHER_WITH_FABRICS ||
      advancedProductType === ADVANCED_PRODUCT_TYPE_OTHER
    if (!isComponentBased) continue

    const rows = buildComponentRows(
      advancedProduct,
      DUMMY_DIMENSION_DECIMALS,
      modelGroupCodeFor(advancedProductType),
      resolveEnabledGroupIds(advancedProduct)
    )
    for (const row of rows) {
      if (row.kind === "data" && row.photoUrl) urls.add(row.photoUrl)
    }
  }

  return urls
}

/**
 * Writes a group section-label row on an OTHER_WITH_FABRICS/OTHER sheet — styled
 * as the SAME dark bar as GROUP_HEADER_ROW (row 12's "MODULES" / CAT1 ...
 * Leather B row, see writeHeaderRows), using the same resolved `cfg.groupHeaderFill`
 * / `cfg.groupHeaderFont` so a brand override always matches both bars (see
 * RenderConfig's doc comment). The label is written into column 1 (not
 * DESCRIPTION_COL) and merged across columns 1-3, mirroring exactly how row
 * 12 writes "MODULES" into `groupRow.getCell(1)` and then merges
 * `(GROUP_HEADER_ROW, 1, GROUP_HEADER_ROW, 3)` — a value left in column 2
 * would be silently discarded once column 1 becomes the merge's master
 * cell. That merge is unconditionally 3 columns (never degenerate, unlike
 * the variable-width "PRICE (EUR)" merge in writeHeaderRows), and never
 * collides with a price column: price labels/cells start at
 * `cfg.fixedColumnCount + 1`, which is >= 4 either way (3 when
 * `showVolumeColumn` is off, 4 when on).
 *
 * `sortedGroupNumbers`/CAT-label cells are only populated when
 * `hasCategoryPrices` is true (a section with real per-fabric-category
 * pricing) — an all-flat-priced section (e.g. mattresses) gets the same
 * dark bar and section name but leaves those cells valueless, per this
 * file's border-only convention for an intentionally blank cell (see
 * writeHeaderRows's doc comment on D12).
 *
 * Every cell in the row (including blank ones, like the flat-section price
 * columns, or M3_COL when `showVolumeColumn`) is styled — fill/font/border/
 * alignment — BEFORE the merge call, same ordering rule as writeHeaderRows.
 */
function writeSectionLabelRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  label: string,
  sortedGroupNumbers: number[],
  hasCategoryPrices: boolean,
  cfg: RenderConfig
): void {
  const row = sheet.getRow(rowNumber)
  row.height = SECTION_LABEL_ROW_HEIGHT

  const lastCol = cfg.fixedColumnCount + sortedGroupNumbers.length

  row.getCell(1).value = label
  if (hasCategoryPrices) {
    sortedGroupNumbers.forEach((groupNumber, i) => {
      row.getCell(cfg.fixedColumnCount + 1 + i).value = getGroupLabel(
        groupNumber
      )
    })
  }

  for (let col = 1; col <= lastCol; col++) {
    const cell = row.getCell(col)
    cell.border = cfg.thinBorder
    cell.fill = cfg.groupHeaderFill
    cell.font = cfg.groupHeaderFont
    cell.alignment = CENTER_MIDDLE_ALIGNMENT
  }

  sheet.mergeCells(rowNumber, 1, rowNumber, 3)
}

/**
 * Per-workbook context for embedding a component's own photo into column A
 * of its data row (see COMPONENT_PHOTO_BOX's doc comment for the sizing
 * rationale). Shaped like BlueprintEmbedContext — workbook/buffers/idByUrl
 * shared across every row that uses it — but with no `scale` field: unlike a
 * module blueprint, a component photo is never resized proportionally to a
 * real physical dimension; it's a fixed decorative box, same treatment as
 * the category-photo block in buildPricelistWorkbook. Kept as ITS OWN idByUrl
 * map (never shared with imageIdByUrl or blueprintIdByUrl) for the same
 * reason those two are already kept separate — see blueprintIdByUrl's doc
 * comment.
 */
interface ComponentPhotoEmbedContext {
  workbook: ExcelJS.Workbook
  /**
   * url -> already-fetched, already-validated, already-resized JPEG (or
   * null/absent) — see PricelistImage's doc comment for what `width`/
   * `height` being `null` means (resize unavailable/failed, `buffer` is the
   * ORIGINAL un-resized fetch).
   */
  buffers: Map<string, PricelistImage | null>
  idByUrl: Map<string, number>
}

/**
 * Writes one component/base-price row on an OTHER_WITH_FABRICS/OTHER sheet —
 * same cell layout as writeDataRow (description/art-code/volume/price
 * columns, borders), plus its OWN component-photo embed in column A (see
 * ComponentPhotoEmbedContext/COMPONENT_PHOTO_BOX) — unlike a sofa
 * module, a component never carries a blueprint thumbnail (that concept
 * doesn't apply here), so the two embed paths never overlap on one row.
 *
 * Row height is decided HERE, per row, from whether a buffer was actually
 * fetched for `data.photoUrl` — never from URL presence alone. A photo can
 * be "missing" for several independent reasons (no image at all, skipped as
 * the shared image404 placeholder, a fetch/validation failure, or a
 * rejected byte-budget overflow — see pricelist-component-photos.ts), and
 * every one of them must fall back to the shorter, image-less
 * COMPONENT_DATA_ROW_HEIGHT, matching an ordinary image-less component row
 * exactly.
 */
function writeComponentDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  data: ComponentDataRow,
  sortedGroupNumbers: number[],
  photoCtx: ComponentPhotoEmbedContext,
  cfg: RenderConfig
): void {
  const photoEntry = data.photoUrl ? photoCtx.buffers.get(data.photoUrl) : null

  const row = sheet.getRow(rowNumber)
  // Reflects whether a photo will actually be embedded below — never from
  // URL presence alone (see this function's doc comment for the several
  // independent reasons `photoEntry` can still be falsy even when
  // `data.photoUrl` is set).
  row.height = photoEntry ? DATA_ROW_HEIGHT : COMPONENT_DATA_ROW_HEIGHT

  row.getCell(DESCRIPTION_COL).value = data.description
  row.getCell(DESCRIPTION_COL).alignment = {
    wrapText: true,
    vertical: "middle",
    horizontal: "left",
  }

  row.getCell(ART_CODE_COL).value = data.artCode
  row.getCell(ART_CODE_COL).alignment = CENTER_MIDDLE_ALIGNMENT

  if (cfg.showVolumeColumn) {
    row.getCell(M3_COL).value = data.volume
    row.getCell(M3_COL).numFmt = VOLUME_NUMBER_FORMAT
    row.getCell(M3_COL).alignment = CENTER_MIDDLE_ALIGNMENT
  }

  sortedGroupNumbers.forEach((groupNumber, i) => {
    const cell = row.getCell(cfg.fixedColumnCount + 1 + i)
    const price = data.priceByGroup
      ? data.priceByGroup.get(groupNumber)
      : i === 0
        ? data.flatPrice ?? undefined
        : undefined
    // Same `price !== undefined` convention as writeDataRow: a component
    // with no price for this column stays genuinely blank, while a real
    // price of 0 still gets written.
    if (price !== undefined) {
      cell.value = {
        formula: `${price}*IF(N($C$9)>0,$C$9,1)`,
        result: price,
      }
    }
    cell.numFmt = cfg.priceNumFmt
    cell.alignment = CENTER_MIDDLE_ALIGNMENT
  })

  // Column A (PICTURE): embeds this component's own photo when one was
  // actually fetched; stays genuinely blank otherwise — same "never an
  // error" discipline as writeDataRow's blueprint block and the
  // category-photo embed in buildPricelistWorkbook. Anchored via
  // addCenteredPictureCellImage (same native-EMU technique as writeDataRow's
  // blueprint image — see that function's doc comment for the exceljs bug
  // this sidesteps) — NOT the blueprint's per-sheet scale ratio, which only
  // makes sense for a proportionally-sized line drawing, not this fixed
  // decorative photo box.
  if (data.photoUrl && photoEntry) {
    let imageId = photoCtx.idByUrl.get(data.photoUrl)
    if (imageId === undefined) {
      imageId = photoCtx.workbook.addImage({
        // Same upstream exceljs .d.ts Buffer-vs-ArrayBuffer typing quirk as
        // the category-photo/blueprint embeds — see either of those calls'
        // comment for why `as any` is correct here, not a type-safety
        // workaround.
        buffer: photoEntry.buffer as any,
        extension: "jpeg",
      })
      photoCtx.idByUrl.set(data.photoUrl, imageId)
    }

    // ext is resolved from the ACTUAL (trimmed + resized) pixel dimensions
    // when known (see resolvePhotoExt/PricelistImage) — a component's own
    // photo can genuinely be non-square after trimming its background (see
    // COMPONENT_PHOTO_BOX's doc comment), so this fits inside the FULL
    // rectangular cell (not a fixed square) and can come out up to 85px wide
    // or 65px tall depending on the trimmed item's own aspect ratio.
    // Centering (inside addCenteredPictureCellImage) uses this resolved box,
    // so a narrower/shorter fit still centers correctly inside the cell
    // instead of hugging one corner.
    const ext = resolvePhotoExt(photoEntry, COMPONENT_PHOTO_BOX)
    addCenteredPictureCellImage(sheet, imageId, rowNumber, ext)
  }

  const lastCol = cfg.fixedColumnCount + sortedGroupNumbers.length
  for (let col = 1; col <= lastCol; col++) {
    row.getCell(col).border = cfg.thinBorder
  }
}

// ===== Category grouping (pricelist export) =====
//
// Groups admitted products by category for the per-product sheet order and
// the Info sheet's product index — see groupProductsByCategory's own doc
// comment for the single-tree invariant that keeps the two in sync, and
// buildPricelistWorkbook for where this section is invoked. Ordering
// mirrors FIND_MENU_CATEGORIES's own admin/menu order (top-level "branch"
// categories by menu_order asc, then their "leaf" children by menu_order
// asc — see src/lib/furnisystems-sdk/modules/categories/index.ts) rather
// than re-deriving a different order from scratch.

/**
 * The display name used for BOTH the sheet name (via safeSheetName, in
 * buildPricelistWorkbook) and the category-group sort key
 * (groupProductsByCategory below) — extracted into one function so the two
 * can never diverge. Falls back to `Product ${id}` when the export language
 * has no AdvancedProductProfile at all (e.g. a de/fr request for a product
 * whose only profile is en).
 */
function resolveProductName(
  advancedProduct: PricelistExportAdvancedProduct,
  productId: number
): string {
  return (
    advancedProduct.advanced_product_profiles[0]?.name ??
    `Product ${productId}`
  )
}

// Sentinel id used for BOTH "no branch" (the Uncategorized bucket, as a key
// into groupProductsByCategory's `branches` map) and "no leaf" (a product
// grouped directly under its branch, as a key into that branch's `leaves`
// map) — the two maps are independent, so one shared sentinel value never
// collides across them. Never collides with a real Category.id either (all
// positive, autoincrement).
const NO_CATEGORY_KEY = -1

// Fixed per-language label for products with neither a usable
// primary_category nor any non-root linked categories entry (a REAL, live
// case — verified against local data: 5 of 6 visible primary_categoryId=24
// ("All Products" root) products have categories = [24] only, and 13
// visible sofa products have neither field set at all). Not resolved via
// CategoryProfile — there is no category to read a profile from — so this
// is hardcoded the same way the workbook's other fixed strings ("Company",
// "Pricelist", "Product name"...) are.
const UNCATEGORIZED_LABEL: Record<string, string> = {
  en: "Uncategorized",
  de: "Ohne Kategorie",
  fr: "Sans catégorie",
}

function resolveUncategorizedLabel(language: string): string {
  return UNCATEGORIZED_LABEL[language.toLowerCase()] ?? UNCATEGORIZED_LABEL.en
}

/**
 * Resolves a Category's display name for `language`, falling back to
 * English, then to whatever profile IS present, then to a synthetic
 * `Category ${id}` label. `profiles` must be UNFILTERED (every language) —
 * see ProductsModule.getSofaPricelistExportProducts's query doc comment:
 * the top-level "branch" categories (Soft Furniture/Hard Furniture/Other)
 * carry only an `en` CategoryProfile today, so filtering server-side would
 * blank every de/fr branch heading instead of falling back to en. This is
 * the ONE place that fallback rule lives — every other spot in this file
 * that resolves a category or product name calls into this function rather
 * than re-implementing it.
 */
export function resolveCategoryName(
  profiles: { language: string; name: string }[] | null | undefined,
  language: string,
  categoryId: number
): string {
  const list = profiles ?? []
  const normalized = language.toLowerCase()
  const exact = list.find((p) => p.language.toLowerCase() === normalized)
  if (exact) return exact.name
  const en = list.find((p) => p.language.toLowerCase() === "en")
  if (en) return en.name
  if (list.length > 0) return list[0].name
  return `Category ${categoryId}`
}

export interface CategoryGroupHeading {
  id: number
  name: string
  order: number
}

function toCategoryHeading(
  category: PricelistExportCategoryRef | PricelistExportCategoryParentRef,
  language: string
): CategoryGroupHeading {
  return {
    id: category.id,
    order: category.menu_order,
    name: resolveCategoryName(
      category.category_profiles,
      language,
      category.id
    ),
  }
}

/**
 * Orders two linked Category candidates by MENU POSITION — (branch
 * menu_order, leaf menu_order), then id as the final tiebreak — so a
 * product linked under more than one leaf lands under whichever heading a
 * human would predict from the admin menu, not whichever happened to get
 * the lower database id. `branchOrderOf`/`leafOrderOf` read a candidate's
 * OWN menu_order as the "branch" position when it has no parent (it IS a
 * branch-level category) and its parent's menu_order otherwise.
 */
function compareCategoriesByMenuPosition(
  a: PricelistExportCategoryRef,
  b: PricelistExportCategoryRef
): number {
  const branchOrderOf = (c: PricelistExportCategoryRef): number =>
    c.parent_category ? c.parent_category.menu_order : c.menu_order
  const leafOrderOf = (c: PricelistExportCategoryRef): number =>
    c.parent_category ? c.menu_order : Number.NEGATIVE_INFINITY

  return (
    branchOrderOf(a) - branchOrderOf(b) ||
    leafOrderOf(a) - leafOrderOf(b) ||
    a.id - b.id
  )
}

/**
 * Picks the group key's source Category among a product's `categories` (the
 * m2m relation, which typically carries the full ancestor chain — root +
 * branch + leaf — since the category-link flow propagates a product's
 * categories up to their ancestors). Prefers an entry that HAS a parent
 * (leaf-level, in today's two-level category tree) over one that doesn't
 * (branch-level) — named "most specific", not "deepest": this does NOT
 * walk the tree to compute a real depth, it only checks for one parent
 * link, and the query's shape (see PricelistExportCategoryParentRef) never
 * carries a grandparent to walk to anyway. Real data can carry MORE THAN
 * ONE parented entry (e.g. a product linked under both "Comfort Chairs" and
 * "Chairs" — verified against local data, id 1618/"STORMY CHAIR"); ties
 * are broken by menu position (see compareCategoriesByMenuPosition).
 *
 * "Has a parent" is tested via the HYDRATED `parent_category` object, not
 * the `parent_categoryId` scalar — the same test
 * compareCategoriesByMenuPosition's `branchOrderOf` uses. A candidate whose
 * `parent_categoryId` is set but whose `parent_category` didn't arrive in
 * the query response (see resolveProductCategoryGroup's console.warn for
 * that gap) is therefore treated as branch-level HERE too, so the pool this
 * function builds and the comparator that sorts it never disagree about
 * which candidates are "parented".
 */
function pickMostSpecificNonRootCategory(
  categories: PricelistExportCategoryRef[]
): PricelistExportCategoryRef | null {
  const nonRoot = categories.filter((c) => !c.is_root_category)
  if (nonRoot.length === 0) return null
  const withParent = nonRoot.filter((c) => c.parent_category != null)
  const pool = withParent.length > 0 ? withParent : nonRoot
  return [...pool].sort(compareCategoriesByMenuPosition)[0]
}

/**
 * The single Category a product groups under: `primary_category` unless
 * it's root-level (e.g. the "All Products" root — real, visible products
 * are assigned that as their PRIMARY category today, see
 * ProductsModule.getSofaPricelistExportProducts's query doc comment), in
 * which case this falls through to the `categories` m2m relation exactly as
 * if `primary_category` were unset entirely. Returns null when neither
 * source yields a usable (non-root) category — the caller's Uncategorized
 * bucket.
 *
 * `categories` is ERP-owned and rewritten nightly: the import full-replaces
 * it for erp_synced categories (admin-curated, non-erp_synced links are
 * left alone) — see the "Nightly category-link wipe" memory. A product
 * relying on this fallback can therefore move to a different heading, or
 * into Uncategorized, after the next import run.
 */
function resolveCandidateCategory(
  product: PricelistExportProduct
): PricelistExportCategoryRef | null {
  const primary = product.primary_category
  if (primary && !primary.is_root_category) {
    return primary
  }
  return pickMostSpecificNonRootCategory(product.categories ?? [])
}

interface ResolvedProductCategoryGroup {
  branch: CategoryGroupHeading
  leaf: CategoryGroupHeading | null
}

/**
 * Resolves one product's `{ branch, leaf }` group, or null (Uncategorized).
 * `branch` = the candidate category's parent, or the candidate itself when
 * it has none (a product whose primary/linked category IS a top-level
 * branch groups directly under that branch, with no leaf sub-heading). Only
 * ONE level up is ever read — a candidate 3+ levels deep still groups under
 * its immediate parent, never a grandparent (per this feature's spec:
 * "don't walk further"). The `parent.is_root_category` check is defensive,
 * not exercised by today's data (every real leaf's parent is a true branch,
 * never the "All Products" root) — kept because the query already carries
 * that field for free, and it keeps the tree internally consistent (never
 * shows the meaningless root as a heading) if that ever changes.
 */
function resolveProductCategoryGroup(
  product: PricelistExportProduct,
  language: string
): ResolvedProductCategoryGroup | null {
  const candidate = resolveCandidateCategory(product)
  if (!candidate) return null

  const parent = candidate.parent_category
  if (candidate.parent_categoryId != null && !parent) {
    // Data/query gap, not the expected "this category has no parent" case
    // below — Category.parent_categoryId says a parent EXISTS, but the
    // query response didn't carry it. Warn so a since-deleted parent or a
    // partial GraphQL response is traceable, instead of silently rendering
    // `candidate` as if it genuinely were a top-level branch.
    console.warn(
      `[pricelist-export] category ${candidate.id} has parent_categoryId=` +
        `${candidate.parent_categoryId} but no parent_category in the ` +
        "query response — grouping it as a branch-level heading."
    )
  }
  if (!parent || parent.is_root_category) {
    return { branch: toCategoryHeading(candidate, language), leaf: null }
  }
  return {
    branch: toCategoryHeading(parent, language),
    leaf: toCategoryHeading(candidate, language),
  }
}

export interface CategoryLeafGroup<T> {
  leaf: CategoryGroupHeading | null
  items: T[]
}

export interface CategoryBranchGroup<T> {
  branch: CategoryGroupHeading
  leaves: CategoryLeafGroup<T>[]
}

// Internal accumulator shapes for groupProductsByCategory below — module
// scope (not nested in the function) purely so their generic parameter
// doesn't shadow the function's own `T`, and so they're readable in
// isolation. `heading`/`items` (not CategoryLeafGroup's public `leaf`/
// `items`) is renamed to the public shape only at groupProductsByCategory's
// final `.map` boundary.
interface LeafAcc<TItem> {
  heading: CategoryGroupHeading | null
  items: TItem[]
}
interface BranchAcc<TItem> {
  heading: CategoryGroupHeading
  leaves: Map<number, LeafAcc<TItem>>
}

/**
 * Groups `items` by category — admin/menu order (branch menu_order asc,
 * then leaf menu_order asc, ties by id; mirrors FIND_MENU_CATEGORIES's own
 * ordering in categories/index.ts), Uncategorized branch always LAST,
 * products within a leaf alphabetical by `item.productName` (locale "en",
 * base sensitivity; ties by `item.product.id`). Within a branch, the
 * null-leaf group (products whose resolved category IS the branch, no leaf
 * sub-heading) always sorts FIRST — otherwise it would render below a real
 * leaf sub-heading and read as belonging to that leaf.
 *
 * Drives BOTH the product-sheet order and the Info sheet's headed index —
 * see buildPricelistWorkbook, which runs this exactly once and derives both
 * from the single returned tree, so sheet order and index headings can
 * never disagree. This is the ONE place that invariant is established;
 * callers reference it rather than re-stating it.
 *
 * `items` must already be the FINAL admitted/renderable set (every skip —
 * no advanced_product, a sofa with zero priced forms, a component product
 * with zero priced rows — already applied). Grouping a product that will
 * never get a sheet would render an Info-sheet heading over nothing.
 */
export function groupProductsByCategory<
  T extends { product: PricelistExportProduct; productName: string }
>(items: T[], language: string): CategoryBranchGroup<T>[] {
  const branches = new Map<number, BranchAcc<T>>()

  for (const item of items) {
    const group = resolveProductCategoryGroup(item.product, language)
    const branchKey = group ? group.branch.id : NO_CATEGORY_KEY
    let branchAcc = branches.get(branchKey)
    if (!branchAcc) {
      branchAcc = {
        heading: group
          ? group.branch
          : {
              id: NO_CATEGORY_KEY,
              name: resolveUncategorizedLabel(language),
              order: Number.POSITIVE_INFINITY,
            },
        leaves: new Map(),
      }
      branches.set(branchKey, branchAcc)
    }
    const leafKey = group?.leaf ? group.leaf.id : NO_CATEGORY_KEY
    let leafAcc = branchAcc.leaves.get(leafKey)
    if (!leafAcc) {
      leafAcc = { heading: group?.leaf ?? null, items: [] }
      branchAcc.leaves.set(leafKey, leafAcc)
    }
    leafAcc.items.push(item)
  }

  const sortedBranches = Array.from(branches.values()).sort(
    (a, b) => a.heading.order - b.heading.order || a.heading.id - b.heading.id
  )

  return sortedBranches.map((branchAcc) => {
    const sortedLeaves = Array.from(branchAcc.leaves.values()).sort((a, b) => {
      const orderA = a.heading ? a.heading.order : Number.NEGATIVE_INFINITY
      const orderB = b.heading ? b.heading.order : Number.NEGATIVE_INFINITY
      if (orderA !== orderB) return orderA - orderB
      const idA = a.heading ? a.heading.id : Number.NEGATIVE_INFINITY
      const idB = b.heading ? b.heading.id : Number.NEGATIVE_INFINITY
      return idA - idB
    })
    for (const leafAcc of sortedLeaves) {
      leafAcc.items.sort(
        (x, y) =>
          x.productName.localeCompare(y.productName, "en", {
            sensitivity: "base",
          }) || x.product.id - y.product.id
      )
    }
    return {
      branch: branchAcc.heading,
      leaves: sortedLeaves.map((leafAcc) => ({
        leaf: leafAcc.heading,
        items: leafAcc.items,
      })),
    }
  })
}

/**
 * One admitted product, resolved once by buildPricelistWorkbook's pre-pass
 * before category grouping runs — see groupProductsByCategory (which groups
 * these) for the ordering/invariant this feeds, and buildPricelistWorkbook
 * for where `sheetName` gets filled in (its own dedicated pass, run AFTER
 * grouping — see that pass's own comment for why).
 */
interface RenderableProduct {
  product: PricelistExportProduct
  advancedProduct: PricelistExportAdvancedProduct
  isSofa: boolean
  componentRows: ComponentSheetRow[]
  productName: string
  sheetName: string
}

/**
 * Builds the pricelist export workbook: one "Info" sheet (company, pricelist
 * name, generation date, currency note, and a product-name -> sheet-name
 * index) plus one sheet per SOFA, OTHER_WITH_FABRICS, or OTHER product,
 * listing its priced modules (sofa) or additional components
 * (OTHER_WITH_FABRICS/OTHER — see the "OTHER_WITH_FABRICS / OTHER support"
 * section above) under a 10-row photo block (see PHOTO_ROW_COUNT) and a
 * two-tier catalog header (see writeHeaderRows).
 *
 * `photoBuffers` maps a product's category-photo URL to its already-fetched,
 * already-validated, already-RESIZED JPEG (see fetchPricelistPhotos and
 * PricelistImage's doc comment for what a `null` `width`/`height` means) — a
 * missing entry, or `null`, means "no photo for this product" and is never
 * an error: an absent decorative photo must never cost the customer their
 * price data. The same URL is deliberately embedded into the workbook at
 * most once (tracked via `imageIdByUrl` below) since many products share one
 * photo.
 *
 * `blueprintBuffers` is a similar shape (url -> buffer|null) but for
 * per-MODULE blueprint thumbnails (see fetchPricelistBlueprints) and is
 * deduped separately, via `blueprintIdByUrl` — two independent maps because
 * the two image sets share nothing (different URLs, different cells,
 * different sizing rule: fixed-box for the photo vs. proportional-per-sheet
 * for blueprints, see computeBlueprintScale). Blueprints are NOT resized
 * (still a bare `Buffer`, not `PricelistImage`) — they're tiny PNGs already
 * (measured ~400-1,300 bytes each), nowhere near the byte pressure that
 * motivated resizing the two JPEG pools.
 *
 * `componentPhotoBuffers` is the same `PricelistImage` shape as
 * `photoBuffers` but for each OTHER/OTHER_WITH_FABRICS component's OWN photo
 * (see fetchPricelistComponentPhotos, which fetches a SUBSET of
 * collectComponentPhotoUrls's full candidate set — that fetch pool further
 * filters out the shared image404 placeholder and enforces its own
 * count/byte budget, so this map's keys are a subset of, never a superset
 * of, what collectComponentPhotoUrls returns), deduped separately via its
 * own `componentPhotoIdByUrl` for the same reason as
 * `blueprintIdByUrl`. Unlike the other two image sets, whether a given row
 * GETS this image also changes that row's height (DATA_ROW_HEIGHT vs
 * COMPONENT_DATA_ROW_HEIGHT — see writeComponentDataRow's doc comment);
 * sofa rows and the category-photo/blueprint embeds are entirely unaffected
 * by this parameter.
 *
 * Price columns are derived once from the distinct fabric-category
 * `group_number`s that actually have a price row anywhere in `products`
 * (group numbers are sparse/non-contiguous — see callers), so every product
 * sheet shares the same column layout and headers use the real group
 * number's label (see GROUP_LABELS/getGroupLabel), never a positional index.
 */
export async function buildPricelistWorkbook(
  products: PricelistExportProduct[],
  meta: PricelistWorkbookMeta,
  photoBuffers: Map<string, PricelistImage | null>,
  blueprintBuffers: Map<string, Buffer | null>,
  componentPhotoBuffers: Map<string, PricelistImage | null>,
  settings?: PricelistWorkbookSettings
): Promise<ExcelJS.Buffer> {
  // Resolved ONCE for the whole workbook — every sheet shares the same
  // rendering config (see RenderConfig/resolveRenderConfig above). Absent
  // `settings` (every pre-existing caller, incl. this file's own
  // verification harnesses) resolves to today's exact hardcoded constants.
  const cfg = resolveRenderConfig(settings)
  // Drives category-heading name resolution (resolveCategoryName) and the
  // Uncategorized bucket's label (resolveUncategorizedLabel) — see
  // PricelistWorkbookMeta.language's doc comment for the "en" default.
  const language = meta.language ?? "en"

  // NOTE: this pool is intentionally shared by EVERY sheet, sofa and
  // OTHER_WITH_FABRICS/OTHER alike (see this function's doc comment on
  // sortedGroupNumbers) — a group_number seen only on an OTHER_WITH_FABRICS/
  // OTHER component now adds a (blank, for every sofa) CAT column to every
  // sofa sheet too. In practice this is expected to be a no-op: FabricPriceCategory
  // is one shared taxonomy across the whole catalog (the same CAT1-5/Leather
  // A/B groups from GROUP_LABELS), not a per-product-type one, so component
  // group_numbers are expected to already be a subset of the sofa ones. This
  // is NOT verified against production data by this change, though — if that
  // assumption is ever wrong, a real (not merely theoretical) sofa-sheet
  // diff would appear the next time this export runs.
  //
  // The per-association `price_fabric_category` walk below skips exactly
  // what buildComponentRows will never render for that association, so this
  // pool never reserves a column no sheet actually uses: (1) components
  // whose group isn't enabled for this product (`resolveEnabledGroupIds` —
  // same helper, same semantics, as the per-sheet filtering below), and (2)
  // groups with `use_fabric_prices_for_components === false`, whose
  // `price_fabric_category` rows buildComponentRows ignores entirely in
  // favour of a flat price (see that function's own group-pricing branch).
  const groupNumbers = new Set<number>()
  for (const product of products) {
    const advancedProduct = product.advanced_product
    for (const form of advancedProduct?.sofa_forms ?? []) {
      for (const row of form.form_price_fabric_category) {
        groupNumbers.add(row.fabrice_price_category.group_number)
      }
    }
    for (const row of advancedProduct?.advanced_product_price_fabric_category ??
      []) {
      groupNumbers.add(row.fabrice_price_category.group_number)
    }
    const enabledGroupIdsForPool = advancedProduct
      ? resolveEnabledGroupIds(advancedProduct)
      : null
    for (const assoc of advancedProduct?.additional_component_to_advanced_product ??
      []) {
      const group = assoc.additional_component?.additional_component_group
      if (!group) continue
      if (enabledGroupIdsForPool && !enabledGroupIdsForPool.has(group.id)) {
        continue
      }
      if (group.use_fabric_prices_for_components === false) continue
      for (const row of assoc.price_fabric_category) {
        groupNumbers.add(row.fabrice_price_category.group_number)
      }
    }
  }
  // Empty-pool guard (see PRICE_ONLY_GROUP_NUMBER's doc comment): if NO
  // admitted product anywhere in this pricelist carries a real
  // fabric-category price — e.g. a batch made up entirely of flat-priced
  // OTHER/OTHER_WITH_FABRICS products — falling through with an empty array
  // would leave every sheet with zero price columns, silently dropping
  // every flat price too (writeComponentDataRow only ever writes a flat
  // price into `sortedGroupNumbers[0]`).
  const sortedGroupNumbers =
    groupNumbers.size > 0
      ? Array.from(groupNumbers).sort((a, b) => a - b)
      : [PRICE_ONLY_GROUP_NUMBER]

  const workbook = new ExcelJS.Workbook()
  workbook.creator = meta.companyName
  workbook.created = meta.generatedAt

  // Added first so it renders as the leftmost/default tab. The trailing
  // blank row + product index are filled in after the product loop below,
  // once the index rows are known — but the metadata block above them
  // (including the master multiplier) is written right away, since every
  // product sheet's C9 formula needs to reference the multiplier row number.
  const infoSheet = workbook.addWorksheet("Info")

  infoSheet.columns = [{ width: 20 }, { width: 50 }]
  infoSheet.addRow(["Company", meta.companyName])
  infoSheet.addRow(["Pricelist", meta.pricelistName])
  infoSheet.addRow([
    "Generated",
    meta.generatedAt.toISOString().slice(0, 10),
  ])
  infoSheet.addRow(["Currency", `All prices are in ${meta.currency}.`])
  // Master multiplier: every product sheet's C9 defaults to a formula
  // pointing back at this cell (see writeMultiplierCell). The row number is
  // captured from `addRow`'s own return value — NEVER hardcoded — so
  // inserting another metadata row above/below this one can't silently break
  // every sheet's formula.
  const multiplierRow = infoSheet.addRow(["Price multiplier", 1])
  const masterMultiplierRow = multiplierRow.number
  multiplierRow.getCell(1).font = MULTIPLIER_LABEL_FONT

  // Lowercased dedupe keys (see safeSheetName's doc comment) — "info"
  // reserves the Info tab's own name so no product can collide with it,
  // case-insensitively.
  const usedSheetNames = new Set<string>(["info"])

  // Dedupes embedded images by source URL: `workbook.addImage` is called at
  // most once per distinct URL, and every sheet sharing that photo reuses
  // the same returned id — otherwise a photo shared by N products would be
  // embedded N times.
  const imageIdByUrl = new Map<string, number>()

  // Same dedupe pattern as imageIdByUrl, kept SEPARATE (see this function's
  // doc comment above) — module blueprints and category photos never share
  // a URL, but even if they somehow did, sharing one map would wrongly reuse
  // a JPEG-typed embed id for a PNG buffer or vice versa.
  const blueprintIdByUrl = new Map<string, number>()

  // Same dedupe pattern again, kept SEPARATE from both maps above (see
  // ComponentPhotoEmbedContext's doc comment) — a component photo and a
  // category photo are both JPEGs but never share a URL in practice (one is
  // AdvancedProduct.category_photo, the other AdditionalComponent.image),
  // and keeping every image set on its own map means a future change to one
  // can never accidentally corrupt another's dedupe.
  const componentPhotoIdByUrl = new Map<string, number>()

  // Resolves the FINAL admitted/renderable set that will produce a sheet —
  // the same skip-checks the sheet-writing loop used to run inline, moved
  // out front so groupProductsByCategory can group them BEFORE any sheet
  // gets built (see that function's doc comment for why this must already
  // be the final set). Also resolves everything a sheet needs exactly
  // once: isSofa/isComponentBased, componentRows (buildComponentRows is
  // not cheap), and productName (see resolveProductName — used as both the
  // category-sort key and the sheet name's input, so the two can never
  // diverge). `sheetName` is left blank here — see the dedicated pass right
  // after grouping, below.
  const renderableProducts: RenderableProduct[] = []

  for (const product of products) {
    const advancedProduct = product.advanced_product
    if (!advancedProduct) continue

    // Two disjoint sheet-building paths — see this file's "OTHER_WITH_FABRICS
    // support" section above for the component one, which now also covers
    // OTHER (simple products — coffee tables, tops, etc. — priced the same
    // way, just via the "model-other" group instead of "model"; see
    // modelGroupCodeFor). `getSofaPricelistExportProducts`'s `where` never
    // admits any other advanced_product_type, so a product reaching here
    // that's none of these three is unexpected, not just "not yet
    // supported" — skipped defensively rather than rendering a broken/empty
    // sheet for it.
    const isSofa = advancedProduct.advanced_product_type === ADVANCED_PRODUCT_TYPE_SOFA
    const isOtherWithFabrics =
      advancedProduct.advanced_product_type ===
      ADVANCED_PRODUCT_TYPE_OTHER_WITH_FABRICS
    const isOther =
      advancedProduct.advanced_product_type === ADVANCED_PRODUCT_TYPE_OTHER
    const isComponentBased = isOtherWithFabrics || isOther

    // Set of AdditionalComponentGroup ids enabled for THIS product — see
    // resolveEnabledGroupIds's doc comment. Only meaningful for the
    // component-based path; unused for sofas.
    const enabledGroupIds = resolveEnabledGroupIds(advancedProduct)

    const componentRows = isComponentBased
      ? buildComponentRows(
          advancedProduct,
          cfg.dimensionDecimals,
          modelGroupCodeFor(advancedProduct.advanced_product_type),
          enabledGroupIds
        )
      : []

    if (isSofa && advancedProduct.sofa_forms.length === 0) continue
    if (isComponentBased && componentRows.length === 0) {
      // Unlike the sofa skip above (a tautology given
      // getSofaPricelistExportProducts's `where` — sofa_forms is already
      // filtered server-side to priced rows only), the `where`'s
      // OTHER_WITH_FABRICS/OTHER branches and buildComponentRows's
      // client-side filters (priced-only AND enabled-group-only) are
      // INDEPENDENT checks that are expected to agree. If they don't, this
      // product is silently dropped from the customer's pricelist with no
      // other trace — most likely because every association's
      // `additional_component`/`additional_component_group` came back null
      // (a data-integrity gap), or because every priced association's
      // group is enabled-linked-off for this product (the stale-group
      // case buildComponentRows's `enabledGroupIds` filter now catches).
      // Logged, not thrown — the rest of the export must still succeed for
      // every other product.
      console.warn(
        `[pricelist-export] ${advancedProduct.advanced_product_type} product ` +
          `${advancedProduct.id} was admitted by the pricelist where-clause ` +
          "but produced zero priced component rows — skipped from the " +
          "export. enabledGroupIds size: " +
          `${enabledGroupIds?.size ?? "unfiltered"}.`
      )
      continue
    }
    if (!isSofa && !isComponentBased) continue

    renderableProducts.push({
      product,
      advancedProduct,
      isSofa,
      componentRows,
      productName: resolveProductName(advancedProduct, product.id),
      sheetName: "",
    })
  }

  // Ordered by category — see groupProductsByCategory's doc comment for the
  // single-tree invariant this establishes (both the sheet loop below and
  // the Info index writer further down read from this same tree).
  const categoryGroups = groupProductsByCategory(renderableProducts, language)
  const orderedRenderableProducts = categoryGroups.flatMap((branchGroup) =>
    branchGroup.leaves.flatMap((leafGroup) => leafGroup.items)
  )

  // Sheet names resolved in their own pass, in this FINAL grouped order,
  // before any worksheet is created — safeSheetName's dedupe suffix (e.g.
  // "Name (2)") depends on iteration order, so it can't run any earlier
  // than this. Both the sheet-writing loop right below and the Info index
  // writer further down read `sheetName` off the same RenderableProduct
  // object afterwards.
  for (const renderableProduct of orderedRenderableProducts) {
    renderableProduct.sheetName = safeSheetName(
      renderableProduct.productName,
      usedSheetNames
    )
  }

  for (const renderableProduct of orderedRenderableProducts) {
    const { advancedProduct, isSofa, componentRows, productName, sheetName } =
      renderableProduct

    const sheet = workbook.addWorksheet(sheetName)

    // Widths only (NOT `sheet.columns = [...]`, which also pins each
    // column's `header` to row 1 — incompatible with the header living at
    // TOP_HEADER_ROW/GROUP_HEADER_ROW instead).
    cfg.columnWidths.forEach((width, i) => {
      sheet.getColumn(i + 1).width = width
    })
    sortedGroupNumbers.forEach((_, i) => {
      sheet.getColumn(cfg.fixedColumnCount + i + 1).width = GROUP_COLUMN_WIDTH
    })

    // Photo block: give rows 1-10 explicit height so the reserved space
    // actually renders even when no image is placed (an anchored image
    // does not create row height by itself).
    for (let rowNumber = 1; rowNumber <= PHOTO_ROW_COUNT; rowNumber++) {
      sheet.getRow(rowNumber).height = PHOTO_ROW_HEIGHT
    }

    const photoUrl = advancedProduct.category_photo?.src_facebook ?? null
    const photoEntry = photoUrl ? photoBuffers.get(photoUrl) : null
    if (photoUrl && photoEntry) {
      let imageId = imageIdByUrl.get(photoUrl)
      if (imageId === undefined) {
        imageId = workbook.addImage({
          // exceljs's own .d.ts declares a LOCAL `interface Buffer extends
          // ArrayBuffer {}` (not the real Node Buffer) for this field. Under
          // this project's `lib: ["esnext"]`, the global ArrayBuffer type
          // that local interface extends carries newer members (e.g.
          // `resizable`) that Node's actual Buffer (from @types/node) never
          // implements, so a real Buffer never structurally satisfies it —
          // an upstream typing bug, not a runtime issue (ExcelJS reads this
          // field as a plain Node Buffer at runtime).
          buffer: photoEntry.buffer as any,
          extension: "jpeg",
        })
        imageIdByUrl.set(photoUrl, imageId)
      }
      // Fixed-size oneCellAnchor (not a range) — see PHOTO_SIZE_PX comment
      // above for why a range anchor is wrong here. `ext` is resolved from
      // the actual resized dimensions when known (see resolvePhotoExt) —
      // today this is a no-op (src_facebook is uniformly square, so a
      // successful resize always yields back a PHOTO_SIZE_PX square here,
      // byte-for-byte the same box as before resizing existed) but keeps
      // this correct if that ever stops being true, without stretching.
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: resolvePhotoExt(photoEntry, { width: PHOTO_SIZE_PX, height: PHOTO_SIZE_PX }),
      })
    }

    writeHeaderRows(sheet, sortedGroupNumbers, cfg)
    // Per-sheet B9/C9 multiplier input — gated by cfg.showMultiplierRow
    // (see resolveRenderConfig's doc comment for why the Info sheet's own
    // master multiplier row is unaffected by this flag).
    if (cfg.showMultiplierRow) {
      writeMultiplierCell(sheet, masterMultiplierRow)
    }

    if (isSofa) {
      // Computed ONCE per sheet, before the row loop — see
      // computeBlueprintScale's doc comment for why every row on a sheet must
      // share one scale factor rather than each fitting its own image.
      const blueprintScale = computeBlueprintScale(
        advancedProduct.sofa_forms,
        blueprintBuffers
      )
      const blueprintCtx: BlueprintEmbedContext = {
        workbook,
        buffers: blueprintBuffers,
        idByUrl: blueprintIdByUrl,
        scale: blueprintScale,
      }

      let rowNumber = DATA_START_ROW
      for (const form of advancedProduct.sofa_forms) {
        writeDataRow(
          sheet,
          rowNumber,
          form,
          sortedGroupNumbers,
          blueprintCtx,
          cfg
        )
        rowNumber++
      }
    } else {
      // OTHER_WITH_FABRICS/OTHER: `componentRows` was already built above
      // (before the empty-sheet skip check) — see buildComponentRows's doc
      // comment.
      const componentPhotoCtx: ComponentPhotoEmbedContext = {
        workbook,
        buffers: componentPhotoBuffers,
        idByUrl: componentPhotoIdByUrl,
      }

      let rowNumber = DATA_START_ROW
      for (const row of componentRows) {
        if (row.kind === "section") {
          writeSectionLabelRow(
            sheet,
            rowNumber,
            row.label,
            sortedGroupNumbers,
            row.hasCategoryPrices,
            cfg
          )
        } else {
          writeComponentDataRow(
            sheet,
            rowNumber,
            row,
            sortedGroupNumbers,
            componentPhotoCtx,
            cfg
          )
        }
        rowNumber++
      }
    }
  }

  infoSheet.addRow([])

  // Index: headed by category — branch, then leaf sub-heading where one
  // exists — in the exact same order as the sheet tabs above, since both
  // come from the same `categoryGroups` tree (see groupProductsByCategory's
  // doc comment). Sheet names get sanitised/truncated (see safeSheetName),
  // so this lets a customer find the sheet for a product whose name was
  // mangled. The "Sheet name" column stays plain text (not a link) — it
  // exists so someone can find a tab manually when a long name was
  // truncated.
  const indexHeaderRow = infoSheet.addRow(["Product name", "Sheet name"])
  indexHeaderRow.font = { bold: true }
  indexHeaderRow.getCell(1).border = cfg.thinBorder
  indexHeaderRow.getCell(2).border = cfg.thinBorder

  categoryGroups.forEach((branchGroup, branchIndex) => {
    // Blank row BETWEEN branches only — none before the first (it already
    // follows the header row above) and none trailing after the last.
    if (branchIndex > 0) {
      infoSheet.addRow([])
    }

    // Branch heading: same dark bar as GROUP_HEADER_ROW on every product
    // sheet (cfg.groupHeaderFill/Font — see writeSectionLabelRow), merged
    // across both of the Info sheet's columns for a solid-looking bar.
    const branchRow = infoSheet.addRow([branchGroup.branch.name])
    branchRow.getCell(1).font = cfg.groupHeaderFont
    branchRow.getCell(1).fill = cfg.groupHeaderFill
    branchRow.getCell(2).fill = cfg.groupHeaderFill
    infoSheet.mergeCells(branchRow.number, 1, branchRow.number, 2)

    for (const leafGroup of branchGroup.leaves) {
      if (leafGroup.leaf) {
        // Leaf sub-heading: no distinct "light" theme surface exists for
        // this (cfg only resolves the one dark group-header fill/font) —
        // plain bold + an indent, per this feature's spec fallback. Bordered
        // the same as every product/branch row below/above it — otherwise
        // it punches an unbordered gap through what otherwise reads as one
        // continuous bordered table.
        const leafRow = infoSheet.addRow([leafGroup.leaf.name])
        leafRow.getCell(1).font = { bold: true }
        leafRow.getCell(1).alignment = { indent: 1 }
        leafRow.getCell(1).border = cfg.thinBorder
        leafRow.getCell(2).border = cfg.thinBorder
      }

      for (const { productName, sheetName } of leafGroup.items) {
        // Deliberately a HYPERLINK() FORMULA, not ExcelJS's native
        // `cell.value = { text, hyperlink }`. The native form emits both a
        // `<hyperlink>` element AND an OOXML relationship with
        // `TargetMode="External"` even for an internal `#'Sheet'!A1` target —
        // Excel then warns the customer that "this workbook contains links to
        // one or more external sources" on open, which reads as untrustworthy
        // on a customer-facing pricelist. The formula form produces neither a
        // hyperlinks element nor a relationship (verified against the raw XML).
        //
        // Link to `sheetName` (the sanitised/deduped value from safeSheetName),
        // never the raw `productName` — after truncation or a " (2)" collision
        // suffix those can differ, and linking to the raw name would point at a
        // sheet that doesn't exist.
        const escapedSheetName = escapeSheetNameForHyperlinkTarget(sheetName)
        const escapedDisplayName = escapeFormulaStringLiteral(productName)
        const row = infoSheet.addRow([
          {
            formula: `HYPERLINK("#'${escapedSheetName}'!A1","${escapedDisplayName}")`,
            result: productName,
          },
          sheetName,
        ])
        row.getCell(1).font = INDEX_LINK_FONT
        row.getCell(1).border = cfg.thinBorder
        row.getCell(2).border = cfg.thinBorder
      }
    }
  })

  return workbook.xlsx.writeBuffer()
}
