import ExcelJS from "exceljs"
import type {
  PricelistExportProduct,
  PricelistExportSofaForm,
  PricelistExportAdvancedProduct,
  PricelistExportComponentAssociation,
  PricelistExportComponentGroup,
  PricelistExportComponent,
  PricelistExportPriceRow,
} from "@lib/furnisystems-sdk/modules/products/types"

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
}

/**
 * Fabric-price-category `group_number` -> the label its price column shows
 * in row GROUP_HEADER_ROW. Verified against the DB — labels are NOT
 * uniformly "CATn" (11/12 are leather grades, not categories). Anything not
 * listed here (e.g. groups 6, 7, 10, 14 seen on some assigned pricelists)
 * falls back to `CAT${n}` via getGroupLabel below. To add/rename a label,
 * edit ONLY this constant — no other label logic exists in this file.
 */
export const GROUP_LABELS: Record<number, string> = {
  1: "CAT1",
  2: "CAT2",
  3: "CAT3",
  4: "CAT4",
  5: "CAT5",
  11: "Leather A",
  12: "Leather B",
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
// two.
const ADVANCED_PRODUCT_TYPE_SOFA = "SOFA"
const ADVANCED_PRODUCT_TYPE_OTHER_WITH_FABRICS = "OTHER_WITH_FABRICS"

// Code of the AdditionalComponentGroup holding an OTHER_WITH_FABRICS
// product's size/model variants (e.g. "55-BICHON-L110X0/L090X0/L075X0") —
// the analogue of a sofa module here. Mirrors
// src/configurator/lib/vilmers.ts's `MODEL_CODE` constant, used by
// getConfigString's OTHER_WITH_FABRICS branch to pick this same group by
// exact code match — re-declared here (not imported) because that module's
// import graph pulls in the Konva-based configurator context, which has no
// place in a server-side XLSX builder. NOT the same as `MODEL_CODE_OTHER`
// ("model-other"), which is that file's OTHER (not OTHER_WITH_FABRICS)
// branch and is out of this export's scope.
const MODEL_GROUP_CODE = "model"

// Row height (points) for an OTHER_WITH_FABRICS component row. Unlike a sofa
// module row, these never carry a blueprint thumbnail, so there's no reason
// to reserve DATA_ROW_HEIGHT's (55pt, was 110pt) image space — see that
// constant's doc comment for context. 30pt was this table's own row height
// before blueprint embedding existed at all ("Raised 30 -> 110, later halved
// to 55" below).
const COMPONENT_DATA_ROW_HEIGHT = 30

// Row height (points) for an OTHER_WITH_FABRICS group section-label row —
// shorter than COMPONENT_DATA_ROW_HEIGHT since it holds one line of bold
// text, not wrapped description/price cells. Set explicitly rather than
// left at Excel's own default (~15pt), matching this file's convention of
// every other row (photo, sofa module, component) setting its own height
// rather than relying on an implicit one.
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
const PHOTO_SIZE_PX = PICTURE_COLUMN_PX - PHOTO_MARGIN_PX * 2

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
 * product sheet. `sortedGroupNumbers` may be empty — one assigned pricelist
 * genuinely has zero sofa price rows — in which case there are no price
 * columns and no "PRICE (EUR)" merge at all, just the four fixed columns.
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

    // Centres the image in the cell.
    //
    // IMPORTANT, verified against exceljs@4.4.0 source (lib/doc/anchor.js):
    // its documented "fractional tl.col/row" feature (see README's "Add
    // image to a cell" section) does NOT do what the docs imply once a
    // column has a CUSTOM width, like ours. `Anchor#col`'s setter computes
    // `nativeColOff = fraction * colWidth`, where `colWidth` for a custom
    // width is `Math.floor(width * 10000)` — e.g. 250,000 for our
    // width-25 column — and that raw number is then written VERBATIM as
    // the XML `<xdr:colOff>`, which OOXML defines as EMU (9,525 EMU/px).
    // 250,000 EMU is only ~26px, nowhere near this column's real rendered
    // width (~180px) — so a "0.5 = centre" fraction would place the image
    // at roughly the 13px mark, badly left-biased, not centred. (Confirmed
    // by unzipping a generated workbook and reading the raw XML.)
    //
    // Sidestepping the bug entirely: `Anchor`'s constructor also accepts a
    // NATIVE address (`{nativeCol, nativeColOff, nativeRow, nativeRowOff}`),
    // which it stores and later serialises AS-IS with no unit conversion —
    // see exceljs's own `IAnchor`/`CellPositionXform`. Supplying real EMU
    // offsets there (computed from OUR OWN, correct px math) is exact and
    // independent of exceljs's width*10000 approximation. `ImagePosition`'s
    // public .d.ts only advertises `{col, row}` for `tl` (not the native
    // fields), so this needs `as any` — a genuine upstream typing gap, same
    // as the Buffer cast on addImage above, not a type-safety workaround.
    //
    // Scope of the bug: only affects fractional offsets on a CUSTOM-width
    // column/row. `Anchor`'s DEFAULT-width fallback (`colWidth = 640000`
    // when `isCustomWidth` is false) happens to roughly match Excel's real
    // default column width in EMU, which is almost certainly why this went
    // unnoticed upstream. It also does not affect the category-photo anchor
    // above (`tl: {col: 0, row: 0}`) — an INTEGER anchor has no fractional
    // part to mis-convert.
    const EMU_PER_PX = 9525
    const colOffsetPx = Math.max(0, (PICTURE_COLUMN_PX - imageWidth) / 2)
    const rowOffsetPx = Math.max(0, (DATA_ROW_PX - imageHeight) / 2)

    sheet.addImage(imageId, {
      tl: {
        nativeCol: PICTURE_COL - 1,
        nativeColOff: Math.round(colOffsetPx * EMU_PER_PX),
        nativeRow: rowNumber - 1,
        nativeRowOff: Math.round(rowOffsetPx * EMU_PER_PX),
      } as any,
      ext: { width: imageWidth, height: imageHeight },
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

// ===== OTHER_WITH_FABRICS support =====
//
// Unlike a sofa (module geometry with a per-module price), an
// OTHER_WITH_FABRICS product's priced items are additional components —
// see PricelistExportComponentAssociation. `buildComponentRows` below turns
// those into the SAME row shape a sofa module produces (description /
// artCode / volume / a per-CAT-column price), so writeHeaderRows, the
// global CAT-column pooling, and the price-multiplier formula all keep
// working unmodified; only the two small row-writing functions below differ
// from writeDataRow (no blueprint thumbnail — see COMPONENT_DATA_ROW_HEIGHT).

/** One row of an OTHER_WITH_FABRICS sheet: either a group section label, or a priced component/base-price row. */
type ComponentSheetRow = ComponentSectionLabelRow | ComponentDataRow

interface ComponentSectionLabelRow {
  kind: "section"
  label: string
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
 * Orders the non-`model` groups on an OTHER_WITH_FABRICS sheet: by
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

/** Builds one priced-component's data row (shared by the `model` group and every other group's rows below). */
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
  }
}

/**
 * Builds the OTHER_WITH_FABRICS row list for one product: an optional base
 * row, then the `model` group's rows (the size/model variants — the main
 * priced items, analogous to sofa modules, so NOT preceded by a section
 * label), then every other priced group's rows, each preceded by a section
 * label row carrying the group's name.
 *
 * Filters out any component with no price in this pricelist — a product has
 * ~50+ components across ~10 groups (threads-type, shooting, logos,
 * direction, market, threads-colors, design-comfort, model...) and most
 * carry no price at all; they're configuration metadata, not priced items
 * (see resolveComponentFlatPrice's doc comment on the `extra_price`-default
 * trap this guards against). A group with zero priced components after
 * filtering is dropped entirely — including its would-be section label,
 * since a label over nothing reads as a rendering bug.
 */
function buildComponentRows(
  advancedProduct: PricelistExportAdvancedProduct,
  dimensionDecimals: number
): ComponentSheetRow[] {
  const rows: ComponentSheetRow[] = []

  // Base row: a single fabric-category price at the ADVANCED PRODUCT level
  // (chairs/armchairs priced as one whole rather than per-module) — only
  // emitted when that array is non-empty (empirically empty for every local
  // OTHER_WITH_FABRICS product today, but not assumed to stay that way).
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
    (group) => group.code === MODEL_GROUP_CODE
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

    rows.push({ kind: "section", label: getGroupName(group) })
    for (const entry of entries) {
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

  return rows
}

/**
 * Writes a group section-label row on an OTHER_WITH_FABRICS sheet: bold text
 * in the DESCRIPTION column, borders across every column (per this file's
 * stated convention — see writeHeaderRows's doc comment — that an untouched
 * cell reads as a rendering bug, not an intentionally reserved column), and
 * deliberately no `mergeCells` (see writeHeaderRows's doc comment on the
 * degenerate 1x1-merge trap; a label spanning a variable last column has the
 * same failure mode when there are zero price columns).
 */
function writeSectionLabelRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  label: string,
  lastCol: number,
  cfg: RenderConfig
): void {
  const row = sheet.getRow(rowNumber)
  row.height = SECTION_LABEL_ROW_HEIGHT

  const cell = row.getCell(DESCRIPTION_COL)
  cell.value = label
  cell.font = { bold: true }

  for (let col = 1; col <= lastCol; col++) {
    row.getCell(col).border = cfg.thinBorder
  }
}

/**
 * Writes one component/base-price row on an OTHER_WITH_FABRICS sheet — same
 * cell layout as writeDataRow (description/art-code/volume/price columns,
 * borders) minus the blueprint-image block, which doesn't apply here (see
 * COMPONENT_DATA_ROW_HEIGHT's doc comment). Column A (PICTURE) is left
 * genuinely blank — untouched here except for the border loop below, same
 * as an image-less sofa module row.
 */
function writeComponentDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  data: ComponentDataRow,
  sortedGroupNumbers: number[],
  cfg: RenderConfig
): void {
  const row = sheet.getRow(rowNumber)
  row.height = COMPONENT_DATA_ROW_HEIGHT

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

  const lastCol = cfg.fixedColumnCount + sortedGroupNumbers.length
  for (let col = 1; col <= lastCol; col++) {
    row.getCell(col).border = cfg.thinBorder
  }
}

/**
 * Builds the pricelist export workbook: one "Info" sheet (company, pricelist
 * name, generation date, currency note, and a product-name -> sheet-name
 * index) plus one sheet per SOFA or OTHER_WITH_FABRICS product, listing its
 * priced modules (sofa) or additional components (OTHER_WITH_FABRICS — see
 * the "OTHER_WITH_FABRICS support" section above) under a 10-row photo block
 * (see PHOTO_ROW_COUNT) and a two-tier catalog header (see writeHeaderRows).
 *
 * `photoBuffers` maps a product's category-photo URL to its already-fetched,
 * already-validated JPEG bytes (see fetchPricelistPhotos) — a missing entry,
 * or `null`, means "no photo for this product" and is never an error: an
 * absent decorative photo must never cost the customer their price data.
 * The same URL is deliberately embedded into the workbook at most once
 * (tracked via `imageIdByUrl` below) since many products share one photo.
 *
 * `blueprintBuffers` is the same shape (url -> buffer|null) but for
 * per-MODULE blueprint thumbnails (see fetchPricelistBlueprints) and is
 * deduped separately, via `blueprintIdByUrl` — two independent maps because
 * the two image sets share nothing (different URLs, different cells,
 * different sizing rule: fixed-box for the photo vs. proportional-per-sheet
 * for blueprints, see computeBlueprintScale).
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
  photoBuffers: Map<string, Buffer | null>,
  blueprintBuffers: Map<string, Buffer | null>,
  settings?: PricelistWorkbookSettings
): Promise<ExcelJS.Buffer> {
  // Resolved ONCE for the whole workbook — every sheet shares the same
  // rendering config (see RenderConfig/resolveRenderConfig above). Absent
  // `settings` (every pre-existing caller, incl. this file's own
  // verification harnesses) resolves to today's exact hardcoded constants.
  const cfg = resolveRenderConfig(settings)

  // NOTE: this pool is intentionally shared by EVERY sheet, sofa and
  // OTHER_WITH_FABRICS alike (see this function's doc comment on
  // sortedGroupNumbers) — a group_number seen only on an OTHER_WITH_FABRICS
  // component now adds a (blank, for every sofa) CAT column to every sofa
  // sheet too. In practice this is expected to be a no-op: FabricPriceCategory
  // is one shared taxonomy across the whole catalog (the same CAT1-5/Leather
  // A/B groups from GROUP_LABELS), not a per-product-type one, so component
  // group_numbers are expected to already be a subset of the sofa ones. This
  // is NOT verified against production data by this change, though — if that
  // assumption is ever wrong, a real (not merely theoretical) sofa-sheet
  // diff would appear the next time this export runs.
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
    for (const assoc of advancedProduct?.additional_component_to_advanced_product ??
      []) {
      for (const row of assoc.price_fabric_category) {
        groupNumbers.add(row.fabrice_price_category.group_number)
      }
    }
  }
  const sortedGroupNumbers = Array.from(groupNumbers).sort((a, b) => a - b)

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
  const indexRows: { productName: string; sheetName: string }[] = []

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

  for (const product of products) {
    const advancedProduct = product.advanced_product
    if (!advancedProduct) continue

    // Two disjoint sheet-building paths — see this file's "OTHER_WITH_FABRICS
    // support" section above for the component one. `getSofaPricelistExportProducts`'s
    // `where` never admits any OTHER advanced_product_type, so a product
    // reaching here that's neither of these two is unexpected, not just
    // "not yet supported" — skipped defensively rather than rendering a
    // broken/empty sheet for it.
    const isSofa = advancedProduct.advanced_product_type === ADVANCED_PRODUCT_TYPE_SOFA
    const isOtherWithFabrics =
      advancedProduct.advanced_product_type ===
      ADVANCED_PRODUCT_TYPE_OTHER_WITH_FABRICS

    const componentRows = isOtherWithFabrics
      ? buildComponentRows(advancedProduct, cfg.dimensionDecimals)
      : []

    if (isSofa && advancedProduct.sofa_forms.length === 0) continue
    if (isOtherWithFabrics && componentRows.length === 0) {
      // Unlike the sofa skip above (a tautology given
      // getSofaPricelistExportProducts's `where` — sofa_forms is already
      // filtered server-side to priced rows only), the `where`'s
      // OTHER_WITH_FABRICS branch and buildComponentRows's client-side
      // filter are two INDEPENDENT checks that are expected to agree. If
      // they don't, this product is silently dropped from the customer's
      // pricelist with no other trace — most likely because every
      // association's `additional_component`/`additional_component_group`
      // came back null (a data-integrity gap, not a pricing one; see
      // buildComponentRows's inner `continue`). Logged, not thrown — the
      // rest of the export must still succeed for every other product.
      console.warn(
        `[pricelist-export] OTHER_WITH_FABRICS product ${advancedProduct.id} ` +
          "was admitted by the pricelist where-clause but produced zero " +
          "priced component rows — skipped from the export. This likely " +
          "means an admitted association's additional_component or its " +
          "additional_component_group came back null."
      )
      continue
    }
    if (!isSofa && !isOtherWithFabrics) continue

    const productName =
      advancedProduct.advanced_product_profiles[0]?.name ??
      `Product ${product.id}`
    const sheetName = safeSheetName(productName, usedSheetNames)
    indexRows.push({ productName, sheetName })

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
    const photoBuffer = photoUrl ? photoBuffers.get(photoUrl) : null
    if (photoUrl && photoBuffer) {
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
          buffer: photoBuffer as any,
          extension: "jpeg",
        })
        imageIdByUrl.set(photoUrl, imageId)
      }
      // Fixed-size oneCellAnchor (not a range) — see PHOTO_SIZE_PX comment
      // above for why a range anchor is wrong here.
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: PHOTO_SIZE_PX, height: PHOTO_SIZE_PX },
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
      // OTHER_WITH_FABRICS: `componentRows` was already built above (before
      // the empty-sheet skip check) — see buildComponentRows's doc comment.
      let rowNumber = DATA_START_ROW
      for (const row of componentRows) {
        if (row.kind === "section") {
          writeSectionLabelRow(
            sheet,
            rowNumber,
            row.label,
            cfg.fixedColumnCount + sortedGroupNumbers.length,
            cfg
          )
        } else {
          writeComponentDataRow(sheet, rowNumber, row, sortedGroupNumbers, cfg)
        }
        rowNumber++
      }
    }
  }

  infoSheet.addRow([])

  // Index: sheet names get sanitised/truncated (see safeSheetName), so this
  // lets a customer find the sheet for a product whose name was mangled.
  // The "Sheet name" column stays plain text (not a link) — it exists so
  // someone can find a tab manually when a long name was truncated.
  const indexHeaderRow = infoSheet.addRow(["Product name", "Sheet name"])
  indexHeaderRow.font = { bold: true }
  indexHeaderRow.getCell(1).border = cfg.thinBorder
  indexHeaderRow.getCell(2).border = cfg.thinBorder

  for (const { productName, sheetName } of indexRows) {
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

  return workbook.xlsx.writeBuffer()
}
