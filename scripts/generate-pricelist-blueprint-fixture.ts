// Verification script for the pricelist-export PICTURE column (module
// blueprint thumbnails). Drives buildPricelistWorkbook() directly with
// fixture data + real PNG thumbnails pulled from
// furnisystems-backend/blueprint-preview and (optionally) an ad-hoc
// scratch dir of extra sample PNGs — no backend/network involved.
//
// NOTE: this is a throwaway dev-verification script, not a maintained repo
// tool. `SCRATCH_DIR`/`OUT_DIR` default to THIS session's scratchpad path,
// which will not exist in any other session/machine — override both via env
// vars when re-running elsewhere. Missing individual fixture PNGs degrade
// to a skipped spec (with a console.warn), never a crash, so the script
// still produces a (smaller) sample workbook even with only BACKEND_DIR
// available.
//
// Run with: pnpm exec sucrase-node scripts/generate-pricelist-blueprint-fixture.ts
// (uses relative imports only — sucrase does NOT honor tsconfig `paths`, and
// every runtime import in the buildPricelistWorkbook dependency chain is
// either relative or `import type` (erased at compile time), so this works
// without any alias shimming.)
import * as fs from "fs"
import * as path from "path"
import { buildPricelistWorkbook } from "../src/lib/util/pricelist-workbook"
import type {
  PricelistExportProduct,
  PricelistExportSofaForm,
} from "../src/lib/furnisystems-sdk/modules/products/types"

const BACKEND_DIR = path.resolve(
  __dirname,
  "../../furnisystems-backend/blueprint-preview"
)
const SCRATCH_DIR =
  process.env.PRICELIST_FIXTURE_SCRATCH_DIR ??
  "/private/tmp/claude-501/-Users-egidijus-Documents-GitHub-furnisystems-workspace/2f6a8643-45bb-4409-9be7-1bab4ada8751/scratchpad/integration"
const OUT_DIR =
  process.env.PRICELIST_FIXTURE_OUT_DIR ??
  "/private/tmp/claude-501/-Users-egidijus-Documents-GitHub-furnisystems-workspace/2f6a8643-45bb-4409-9be7-1bab4ada8751/scratchpad/pricelist-test"

function readPng(
  fileName: string
): { buffer: Buffer; width: number; height: number } | null {
  const candidates = [
    path.join(BACKEND_DIR, fileName),
    path.join(SCRATCH_DIR, fileName),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) {
    console.warn(
      `[fixture] PNG not found in either dir, skipping this spec's image: ${fileName}`
    )
    return null
  }
  const buffer = fs.readFileSync(found)
  // PNG IHDR chunk: width at bytes 16-19 (big-endian u32), height at 20-23.
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { buffer, width, height }
}

let nextFormId = 1
let nextUrlSeq = 1

interface FormFixtureSpec {
  name: string
  code: string
  /** PNG filename to load as this module's blueprint thumbnail, or null for "no blueprint yet". */
  pngFile: string | null
  /** If true, gives the form a thumbnail_url that's deliberately NOT in blueprintBuffers (simulated fetch failure / budget rejection). */
  simulateFetchFailure?: boolean
  /** Reuse an already-registered blueprint URL instead of minting a new one (dedupe test). */
  reuseUrl?: string
  price?: number
}

function buildForm(
  spec: FormFixtureSpec,
  blueprintBuffers: Map<string, Buffer | null>
): { form: PricelistExportSofaForm; url: string | null } {
  const id = nextFormId++
  let blueprint: PricelistExportSofaForm["blueprint"] = null
  let width: number | null = null
  let height: number | null = null
  let usedUrl: string | null = null

  const png = spec.pngFile ? readPng(spec.pngFile) : null
  if (png) {
    // reuseUrl: simulates two geometrically identical modules sharing one
    // rendered thumbnail (same hash on the backend) -- exercises dedup via
    // blueprintIdByUrl in pricelist-workbook.ts.
    const url =
      spec.reuseUrl ??
      `https://storage.example.com/sofa-blueprints/fixture-${nextUrlSeq++}-thumb.png`
    usedUrl = url
    width = png.width
    height = png.height
    blueprint = {
      status: "rendered",
      thumbnail_url: url,
      thumb_width: png.width,
      thumb_height: png.height,
    }
    if (!spec.simulateFetchFailure) {
      blueprintBuffers.set(url, png.buffer)
    }
    // simulateFetchFailure: URL exists on the form but deliberately never
    // added to blueprintBuffers, mirroring a failed/timed-out/budget-
    // rejected fetch (see pricelist-blueprints.ts) — this row must degrade
    // to a blank PICTURE cell, not throw or corrupt the sheet.
  } else {
    blueprint = {
      status: "not_requested",
      thumbnail_url: null,
      thumb_width: null,
      thumb_height: null,
    }
  }

  const form: PricelistExportSofaForm = {
    id,
    name: spec.name,
    code: spec.code,
    dimensions: { width, height: 90, length: height },
    package_dimensions: [{ volume: 0.5 }],
    form_price_fabric_category: [
      {
        price: spec.price ?? 199.99,
        fabrice_price_category: { group_number: 1 },
      },
      {
        price: (spec.price ?? 199.99) * 1.2,
        fabrice_price_category: { group_number: 2 },
      },
    ],
    blueprint,
  }
  return { form, url: usedUrl }
}

async function main() {
  const blueprintBuffers = new Map<string, Buffer | null>()
  const photoBuffers = new Map<string, Buffer | null>()

  // Sheet 1: a genuinely mixed family, including one big COMPOSITE (the
  // full assembled sofa) alongside small individual modules, plus one
  // "no blueprint yet" row and one "fetch failed" row -- exercises the
  // proportional-scale-shrink path AND both degrade-to-blank paths.
  const romaForms: FormFixtureSpec[] = [
    { name: "Corner cut left", code: "32256-CORNERCUTL", pngFile: "32256-CORNERCUTL-thumb.png" },
    { name: "Corner left", code: "32312-CORNERL", pngFile: "32312-CORNERL-thumb.png" },
    { name: "Angle corner right", code: "43479-ANGLECORNERR", pngFile: "43479-ANGLECORNERR-thumb.png" },
    { name: "Angle corner L+R", code: "47734-ANGLECORNERLR", pngFile: "47734-ANGLECORNERLR-thumb.png" },
    { name: "Many pillow square end", code: "32234-EMANYPILLOWSQ", pngFile: "32234-EMANYPILLOWSQ-thumb.png" },
    { name: "Full composite (reference)", code: "32434-COMPOSITE", pngFile: "32434-COMPOSITE-thumb.png" },
    { name: "Ottoman (no render yet)", code: "99001-OTTOMAN", pngFile: null },
    { name: "Armrest (simulated fetch failure)", code: "99002-ARMREST", pngFile: "45144-A1ROPENEND-thumb.png", simulateFetchFailure: true },
  ]

  // Sheet 2: a more homogeneous family (no giant composite outlier) --
  // exercises the near-scale=1 case, including one genuinely tiny module
  // (a round puf) that should stay visibly smaller than its neighbours.
  const pufForms: FormFixtureSpec[] = [
    { name: "Puf", code: "32259-PUF", pngFile: "32259-PUF-thumb.png" },
    { name: "Round puf (small)", code: "48550-ROUND", pngFile: "48550-ROUND-thumb.png" },
    { name: "Angle corner chaise left", code: "32586-ANGLECORNERLCHL", pngFile: "32586-ANGLECORNERLCHL-thumb.png" },
    { name: "Chaise outer, many pillow, left", code: "40254-LCHOUTERMANYPILLOWSL", pngFile: "40254-LCHOUTERMANYPILLOWSL-thumb.png" },
  ]

  const romaBuilt = romaForms.map((f) => buildForm(f, blueprintBuffers))
  const pufBuilt = pufForms.map((f) => buildForm(f, blueprintBuffers))

  // Dedupe test: two DIFFERENT modules (different form ids/codes) sharing
  // the SAME blueprint URL, as happens when two modules are geometrically
  // identical (same render hash on the backend). Must produce exactly ONE
  // embedded image (via blueprintIdByUrl), not two.
  const cornerCutLeftUrl = romaBuilt[0].url! // "Corner cut left"
  const dedupSpecs: FormFixtureSpec[] = [
    { name: "Corner cut left (dup A)", code: "99101-DUPA", pngFile: "32256-CORNERCUTL-thumb.png", reuseUrl: cornerCutLeftUrl },
    { name: "Corner cut left (dup B)", code: "99102-DUPB", pngFile: "32256-CORNERCUTL-thumb.png", reuseUrl: cornerCutLeftUrl },
  ]
  const dedupBuilt = dedupSpecs.map((f) => buildForm(f, blueprintBuffers))

  // Worst-case mix: the largest real thumbnail measured across both sample
  // dirs (49487-COMPOSITE, 413x309 -- a full multi-module assembled sofa)
  // on the SAME sheet as the smallest (48550-ROUND, a 44x44 puf). This is
  // the case that actually stresses computeBlueprintScale's per-sheet
  // (not per-image) scaling -- see that function's doc comment in
  // pricelist-workbook.ts. Expected, NOT a bug: the puf ends up drawn very
  // small, because relative to a 4m-class composite a 44cm puf genuinely
  // IS very small -- that's the proportional-scale feature working, not a
  // sizing mistake. Reported in the verification writeup rather than
  // "fixed" per-image (which the task explicitly forbids).
  const worstCaseSpecs: FormFixtureSpec[] = [
    { name: "Full composite (largest measured)", code: "49487-COMPOSITE", pngFile: "49487-COMPOSITE-thumb.png" },
    { name: "Round puf (smallest measured)", code: "48550-ROUND", pngFile: "48550-ROUND-thumb.png" },
  ]
  const worstCaseBuilt = worstCaseSpecs.map((f) => buildForm(f, blueprintBuffers))

  const products: PricelistExportProduct[] = [
    {
      id: 1,
      advanced_product: {
        id: 101,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Roma Corner Sofa" }],
        category_photo: null,
        sofa_forms: romaBuilt.map((r) => r.form),
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
      },
    },
    {
      id: 2,
      advanced_product: {
        id: 102,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Puf Collection" }],
        category_photo: null,
        sofa_forms: pufBuilt.map((r) => r.form),
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
      },
    },
    {
      id: 3,
      advanced_product: {
        id: 103,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Dedup Check" }],
        category_photo: null,
        sofa_forms: dedupBuilt.map((r) => r.form),
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
      },
    },
    {
      id: 4,
      advanced_product: {
        id: 104,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Worst Case Mix" }],
        category_photo: null,
        sofa_forms: worstCaseBuilt.map((r) => r.form),
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
      },
    },
  ]

  // --- Print the per-sheet scale/size stats the numbers were chosen from ---
  // (mirrors computeBlueprintScale's own logic so we can sanity-check its
  // output without exporting it from the module).
  const BLUEPRINT_MARGIN_PX = 10
  const columnWidthToPx = (w: number) => Math.round(w * 7 + 5)
  const rowHeightToPx = (pt: number) => Math.round((pt * 4) / 3)
  const COLUMN_A_WIDTH = 25 // must match pricelist-workbook.ts's COLUMN_WIDTHS[0]
  const DATA_ROW_HEIGHT = 110 // must match pricelist-workbook.ts's DATA_ROW_HEIGHT
  const usableW = columnWidthToPx(COLUMN_A_WIDTH) - BLUEPRINT_MARGIN_PX * 2
  const usableH = rowHeightToPx(DATA_ROW_HEIGHT) - BLUEPRINT_MARGIN_PX * 2
  console.log(
    `Column A: ${COLUMN_A_WIDTH} chars ≈ ${columnWidthToPx(COLUMN_A_WIDTH)}px total, ` +
      `${usableW}px usable after ${BLUEPRINT_MARGIN_PX}px margin each side`
  )
  console.log(
    `Data row: ${DATA_ROW_HEIGHT}pt ≈ ${rowHeightToPx(DATA_ROW_HEIGHT)}px total, ` +
      `${usableH}px usable after ${BLUEPRINT_MARGIN_PX}px margin each side`
  )

  for (const product of products) {
    const forms = product.advanced_product!.sofa_forms
    let maxW = 0
    let maxH = 0
    const drawable: { name: string; w: number; h: number }[] = []
    for (const form of forms) {
      const bp = form.blueprint
      const url = bp?.thumbnail_url
      if (!url || !blueprintBuffers.get(url)) continue
      const w = bp!.thumb_width!
      const h = bp!.thumb_height!
      drawable.push({ name: form.name!, w, h })
      if (w > maxW) maxW = w
      if (h > maxH) maxH = h
    }
    const scale = maxW > 0 && maxH > 0 ? Math.min(1, usableW / maxW, usableH / maxH) : 1
    console.log(`\nSheet "${product.advanced_product!.advanced_product_profiles[0].name}": scale=${scale.toFixed(4)}`)
    let smallest: { name: string; px: number } | null = null
    let largest: { name: string; px: number } | null = null
    for (const d of drawable) {
      const drawnW = Math.round(d.w * scale)
      const drawnH = Math.round(d.h * scale)
      const longSide = Math.max(drawnW, drawnH)
      console.log(
        `  ${d.name.padEnd(35)} thumb ${d.w}x${d.h} -> drawn ${drawnW}x${drawnH}` +
          (drawnW > usableW || drawnH > usableH ? "  *** EXCEEDS USABLE BOX ***" : "")
      )
      if (!smallest || longSide < smallest.px) smallest = { name: d.name, px: longSide }
      if (!largest || longSide > largest.px) largest = { name: d.name, px: longSide }
    }
    console.log(`  smallest drawn (long side): ${smallest?.px}px (${smallest?.name})`)
    console.log(`  largest drawn (long side):  ${largest?.px}px (${largest?.name})`)
  }

  const meta = {
    companyName: "Vilmers",
    pricelistName: "Fixture Pricelist (blueprint verification)",
    generatedAt: new Date(),
    currency: "EUR",
  }

  const buf = await buildPricelistWorkbook(products, meta, photoBuffers, blueprintBuffers)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, "pricelist-blueprint-sample.xlsx")
  fs.writeFileSync(outPath, buf as any)
  console.log(`\nWrote ${outPath} (${(buf as unknown as Buffer).length} bytes)`)
  console.log(`Distinct blueprint URLs embedded: ${blueprintBuffers.size}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
