import ExcelJS from "exceljs"
import type {
  PricelistExportProduct,
  PricelistExportSofaForm,
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

const PRICE_NUMBER_FORMAT = "0.00"

// Fixed leading columns on every PRODUCT sheet: PICTURE, DESCRIPTION,
// ART.CODE, M³. Price columns (one per distinct group_number, see
// getSortedGroupNumbers below) start immediately after at
// FIXED_COLUMN_COUNT + 1.
const FIXED_COLUMN_COUNT = 4
const PICTURE_COL = 1
const DESCRIPTION_COL = 2
const ART_CODE_COL = 3
const M3_COL = 4
const COLUMN_WIDTHS = [12, 34, 14.4, 10] // matches FIXED_COLUMN_COUNT; ART.CODE (3rd) widened 12 -> 14.4 (x1.2) to fit codes like "1-ALVAR-B1201"
const GROUP_COLUMN_WIDTH = 11

// Reserved block at the top of every PRODUCT sheet (not the Info sheet) for
// the category photo. The two-tier header lives at TOP_HEADER_ROW /
// GROUP_HEADER_ROW and module data starts at DATA_START_ROW.
const PHOTO_ROW_COUNT = 10
const PHOTO_ROW_HEIGHT = 18 // an anchored image doesn't create row height on its own
const TOP_HEADER_ROW = PHOTO_ROW_COUNT + 1 // 11: PICTURE / DESCRIPTION / ART.CODE / M³ / "PRICE (EUR)"
const GROUP_HEADER_ROW = TOP_HEADER_ROW + 1 // 12: "MODULES" / (blank) / per-group labels
const DATA_START_ROW = GROUP_HEADER_ROW + 1 // 13
const DATA_ROW_HEIGHT = 30 // wrapText alone doesn't grow a row once the column width is fixed
// 10 rows * 18pt ≈ 240px, comfortably fitting a square PHOTO_SIZE_PXxPHOTO_SIZE_PX
// image. Width == height because src_facebook is a square (1080x1080) crop —
// a range anchor (e.g. addImage(id, "A1:F10")) would stretch it to fill a
// wide, short range and visibly distort it, so this uses a fixed-size
// oneCellAnchor instead (see addImage call below).
const PHOTO_SIZE_PX = 180

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
// PHOTO_ROW_HEIGHT (18pt = 24px) each, and the 180px-tall oneCellAnchor
// photo therefore ends inside row 8 (8 * 24px = 192px cumulative, image
// bottom at 180px) — row 9 (starting at 192px) is clear. See
// writeMultiplierCell below.
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
  sortedGroupNumbers: number[]
): void {
  const priceColCount = sortedGroupNumbers.length
  const lastCol = FIXED_COLUMN_COUNT + priceColCount

  const topRow = sheet.getRow(TOP_HEADER_ROW)
  const groupRow = sheet.getRow(GROUP_HEADER_ROW)

  topRow.getCell(PICTURE_COL).value = "PICTURE"
  topRow.getCell(DESCRIPTION_COL).value = "DESCRIPTION"
  topRow.getCell(ART_CODE_COL).value = "ART.CODE"
  topRow.getCell(M3_COL).value = "M³"
  if (priceColCount >= 1) {
    topRow.getCell(FIXED_COLUMN_COUNT + 1).value = "PRICE (EUR)"
  }

  groupRow.getCell(1).value = "MODULES"
  sortedGroupNumbers.forEach((groupNumber, i) => {
    groupRow.getCell(FIXED_COLUMN_COUNT + 1 + i).value = getGroupLabel(
      groupNumber
    )
  })

  for (let col = 1; col <= lastCol; col++) {
    const topCell = topRow.getCell(col)
    topCell.border = THIN_BORDER
    topCell.fill = TOP_HEADER_FILL
    topCell.font = TOP_HEADER_FONT
    topCell.alignment = CENTER_MIDDLE_ALIGNMENT

    const groupCell = groupRow.getCell(col)
    groupCell.border = THIN_BORDER
    groupCell.fill = GROUP_HEADER_FILL
    groupCell.font = GROUP_HEADER_FONT
    groupCell.alignment = CENTER_MIDDLE_ALIGNMENT
  }

  // "MODULES" always spans the 3 module-identity columns regardless of price
  // column count. The "PRICE (EUR)" merge only happens for 2+ price columns
  // (see doc comment above).
  sheet.mergeCells(GROUP_HEADER_ROW, 1, GROUP_HEADER_ROW, 3)
  if (priceColCount >= 2) {
    sheet.mergeCells(
      TOP_HEADER_ROW,
      FIXED_COLUMN_COUNT + 1,
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
 * Writes one module's data row. `dimensions.length` on the SDK type IS the
 * depth (there is no separate `depth` field) — do not go looking for one.
 */
function writeDataRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  form: PricelistExportSofaForm,
  sortedGroupNumbers: number[]
): void {
  const row = sheet.getRow(rowNumber)
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
    const w = width ?? "—"
    const d = length ?? "—"
    const h = height ?? "—"
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

  row.getCell(M3_COL).value = volume
  row.getCell(M3_COL).numFmt = PRICE_NUMBER_FORMAT
  row.getCell(M3_COL).alignment = CENTER_MIDDLE_ALIGNMENT

  sortedGroupNumbers.forEach((groupNumber, i) => {
    const cell = row.getCell(FIXED_COLUMN_COUNT + 1 + i)
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
    cell.numFmt = PRICE_NUMBER_FORMAT
    cell.alignment = CENTER_MIDDLE_ALIGNMENT
  })

  // Column A (PICTURE) is intentionally always blank — reserved for a future
  // module image — but this loop still touches it via getCell(1) so it gets
  // the same border as every other cell in the row instead of reading as a
  // rendering bug. Same reasoning covers any blank price cell when a module
  // has no price in a given group.
  const lastCol = FIXED_COLUMN_COUNT + sortedGroupNumbers.length
  for (let col = 1; col <= lastCol; col++) {
    row.getCell(col).border = THIN_BORDER
  }
}

/**
 * Builds the pricelist export workbook: one "Info" sheet (company, pricelist
 * name, generation date, currency note, and a product-name -> sheet-name
 * index) plus one sheet per sofa product, listing its priced modules under
 * a 10-row photo block (see PHOTO_ROW_COUNT) and a two-tier catalog header
 * (see writeHeaderRows).
 *
 * `photoBuffers` maps a product's category-photo URL to its already-fetched,
 * already-validated JPEG bytes (see fetchPricelistPhotos) — a missing entry,
 * or `null`, means "no photo for this product" and is never an error: an
 * absent decorative photo must never cost the customer their price data.
 * The same URL is deliberately embedded into the workbook at most once
 * (tracked via `imageIdByUrl` below) since many products share one photo.
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
  photoBuffers: Map<string, Buffer | null>
): Promise<ExcelJS.Buffer> {
  const groupNumbers = new Set<number>()
  for (const product of products) {
    for (const form of product.advanced_product?.sofa_forms ?? []) {
      for (const row of form.form_price_fabric_category) {
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

  for (const product of products) {
    const advancedProduct = product.advanced_product
    if (!advancedProduct || advancedProduct.sofa_forms.length === 0) continue

    const productName =
      advancedProduct.advanced_product_profiles[0]?.name ??
      `Product ${product.id}`
    const sheetName = safeSheetName(productName, usedSheetNames)
    indexRows.push({ productName, sheetName })

    const sheet = workbook.addWorksheet(sheetName)

    // Widths only (NOT `sheet.columns = [...]`, which also pins each
    // column's `header` to row 1 — incompatible with the header living at
    // TOP_HEADER_ROW/GROUP_HEADER_ROW instead).
    COLUMN_WIDTHS.forEach((width, i) => {
      sheet.getColumn(i + 1).width = width
    })
    sortedGroupNumbers.forEach((_, i) => {
      sheet.getColumn(FIXED_COLUMN_COUNT + i + 1).width = GROUP_COLUMN_WIDTH
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

    writeHeaderRows(sheet, sortedGroupNumbers)
    writeMultiplierCell(sheet, masterMultiplierRow)

    let rowNumber = DATA_START_ROW
    for (const form of advancedProduct.sofa_forms) {
      writeDataRow(sheet, rowNumber, form, sortedGroupNumbers)
      rowNumber++
    }
  }

  infoSheet.addRow([])

  // Index: sheet names get sanitised/truncated (see safeSheetName), so this
  // lets a customer find the sheet for a product whose name was mangled.
  // The "Sheet name" column stays plain text (not a link) — it exists so
  // someone can find a tab manually when a long name was truncated.
  const indexHeaderRow = infoSheet.addRow(["Product name", "Sheet name"])
  indexHeaderRow.font = { bold: true }
  indexHeaderRow.getCell(1).border = THIN_BORDER
  indexHeaderRow.getCell(2).border = THIN_BORDER

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
    row.getCell(1).border = THIN_BORDER
    row.getCell(2).border = THIN_BORDER
  }

  return workbook.xlsx.writeBuffer()
}
