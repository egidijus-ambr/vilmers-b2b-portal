// Exercises the ACTUAL network path of fetchPricelistPhotos and
// fetchPricelistBlueprints (not just buildPricelistWorkbook's embed side,
// which generate-pricelist-blueprint-fixture.ts covers by hand-building the
// buffer maps). Spins up a local HTTP server so no backend/network is
// needed, and specifically checks the thing the image-fetch.ts extraction
// put at risk: that each pool's injected `validate` really is per-caller
// (a PNG must be rejected by the JPEG pool and vice versa).
//
// Run with: pnpm exec sucrase-node scripts/verify-pricelist-fetch-pools.ts
import * as fs from "fs"
import * as http from "http"
import sharp from "sharp"
import { fetchPricelistPhotos } from "../src/lib/util/pricelist-photos"
import { fetchPricelistBlueprints } from "../src/lib/util/pricelist-blueprints"
import { resolveCategoryPhotoUrls } from "../src/lib/util/pricelist-workbook"
import type { PricelistExportProduct } from "../src/lib/furnisystems-sdk/modules/products/types"
import type { PricelistImage } from "../src/lib/util/image-resize"

const REAL_PNG_PATH =
  "/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/blueprint-preview/32256-CORNERCUTL-thumb.png"
const realPngBytes = fs.readFileSync(REAL_PNG_PATH)

// Synthetic but byte-signature-valid JPEG: isJpeg only checks the 3-byte SOI
// marker (FF D8 FF), so this is honest coverage of what's actually
// validated without needing a full decodable image.
const syntheticJpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9,
])

// A REAL, decodable WEBP — generated from the real PNG fixture via sharp
// (not a hand-rolled magic-byte stub like syntheticJpegBytes above) so the
// end-to-end multi-format check below exercises the actual decode step,
// not just the RIFF/WEBP signature sniff.
let realWebpBytes: Buffer

const requestCounts = new Map<string, number>()

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = req.url ?? "/"
  requestCounts.set(url, (requestCounts.get(url) ?? 0) + 1)

  if (url === "/photo.jpg") {
    res.writeHead(200, { "Content-Type": "image/jpeg" })
    res.end(syntheticJpegBytes)
  } else if (url === "/photo.webp") {
    res.writeHead(200, { "Content-Type": "image/webp" })
    res.end(realWebpBytes)
  } else if (url === "/photo-src.png") {
    res.writeHead(200, { "Content-Type": "image/png" })
    res.end(realPngBytes)
  } else if (url === "/thumb.png") {
    res.writeHead(200, { "Content-Type": "image/png" })
    res.end(realPngBytes)
  } else if (url === "/notanimage") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("hello world, definitely not an image")
  } else if (url === "/photo-403.webp") {
    // Mirrors the real ALVAR 403 seen against live PL50 data — a candidate
    // that fails at the HTTP layer, not a format/validation failure.
    res.writeHead(403)
    res.end("forbidden")
  } else {
    res.writeHead(404)
    res.end("not found")
  }
}

let failed = 0
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`)
  if (!cond) failed++
}

async function main() {
  realWebpBytes = await sharp(realPngBytes).webp().toBuffer()

  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, resolve))
  const address = server.address()
  if (typeof address !== "object" || address === null) {
    throw new Error("failed to bind test server")
  }
  const base = `http://127.0.0.1:${address.port}`

  // Two products sharing ONE category-photo URL (dedup check) and two forms
  // (across products) sharing ONE blueprint URL (dedup check), plus one
  // 404 and one wrong-content-type URL on the blueprint side.
  const products: PricelistExportProduct[] = [
    {
      id: 1,
      advanced_product: {
        id: 101,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Product A" }],
        category_photo: { src_lg: null, src: null, src_facebook: `${base}/photo.jpg` },
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
        sofa_forms: [
          {
            id: 1,
            name: "Module A1",
            code: "A1",
            dimensions: null,
            package_dimensions: [],
            form_price_fabric_category: [],
            blueprint: {
              status: "rendered",
              thumbnail_url: `${base}/thumb.png`,
              thumb_width: 116,
              thumb_height: 116,
            },
          },
          {
            id: 2,
            name: "Module A2 (missing)",
            code: "A2",
            dimensions: null,
            package_dimensions: [],
            form_price_fabric_category: [],
            blueprint: {
              status: "rendered",
              thumbnail_url: `${base}/missing`,
              thumb_width: 50,
              thumb_height: 50,
            },
          },
          {
            id: 3,
            name: "Module A3 (not an image)",
            code: "A3",
            dimensions: null,
            package_dimensions: [],
            form_price_fabric_category: [],
            blueprint: {
              status: "rendered",
              thumbnail_url: `${base}/notanimage`,
              thumb_width: 50,
              thumb_height: 50,
            },
          },
        ],
      },
    },
    {
      id: 2,
      advanced_product: {
        id: 102,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Product B" }],
        // Same photo URL as Product A -- tests photo-pool dedup.
        category_photo: { src_lg: null, src: null, src_facebook: `${base}/photo.jpg` },
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
        sofa_forms: [
          {
            id: 4,
            // Same blueprint URL as Module A1 -- tests blueprint-pool dedup.
            name: "Module B1 (same blueprint as A1)",
            code: "B1",
            dimensions: null,
            package_dimensions: [],
            form_price_fabric_category: [],
            blueprint: {
              status: "rendered",
              thumbnail_url: `${base}/thumb.png`,
              thumb_width: 116,
              thumb_height: 116,
            },
          },
        ],
      },
    },
  ]

  const photoBuffers = await fetchPricelistPhotos(products)
  const blueprintBuffers = await fetchPricelistBlueprints(products)

  // Same upstream lib:["esnext"]-vs-@types/node Buffer typing gap documented
  // in pricelist-workbook.ts's addImage calls -- Buffer#equals' parameter
  // type doesn't structurally match another Buffer under this project's
  // tsconfig, so this needs the same `as any` escape hatch.
  const buffersEqual = (a: Buffer | null | undefined, b: Buffer): boolean =>
    !!a && a.equals(b as any)

  // fetchPricelistPhotos now returns a PricelistImage (buffer + resized
  // width/height, see image-resize.ts) rather than a bare Buffer -- sharp
  // can't decode `syntheticJpegBytes` (it's only a valid SOI marker, not a
  // real decodable image), so resizeForEmbed's own try/catch falls back to
  // the ORIGINAL fetched buffer unchanged. This still exercises exactly what
  // this check is for (byte-identical passthrough of what the server sent).
  const photoBuffersEqual = (
    a: PricelistImage | null | undefined,
    b: Buffer
  ): boolean => !!a && buffersEqual(a.buffer, b)

  check(
    "photo pool: /photo.jpg fetched and accepted as JPEG",
    photoBuffersEqual(photoBuffers.get(`${base}/photo.jpg`), syntheticJpegBytes)
  )
  check(
    "photo pool: dedup -- /photo.jpg requested exactly once despite 2 products referencing it",
    requestCounts.get("/photo.jpg") === 1
  )
  check(
    "blueprint pool: /thumb.png fetched and byte-identical to source PNG",
    buffersEqual(blueprintBuffers.get(`${base}/thumb.png`), realPngBytes)
  )
  check(
    "blueprint pool: dedup -- /thumb.png requested exactly once despite 2 forms referencing it",
    requestCounts.get("/thumb.png") === 1
  )
  check(
    "blueprint pool: 404 degrades to null (never throws)",
    blueprintBuffers.get(`${base}/missing`) === null
  )
  check(
    "blueprint pool: 200 with non-PNG body degrades to null",
    blueprintBuffers.get(`${base}/notanimage`) === null
  )

  // --- resolveCategoryPhotoUrls: pure-function coverage of every branch of
  // the src_lg -> src -> src_facebook candidate-list ordering, including the
  // sharp-unavailable override. This is deliberately NOT an end-to-end test
  // that actually disables the real sharp binary (loadSharp's promise is
  // memoised at module scope for the whole process — see image-resize.ts's
  // own doc comment — so "really" making sharp unavailable mid-process
  // isn't meaningfully possible without a separate process/mock). Testing
  // the exported pure function directly exercises the EXACT same logic
  // fetchPricelistPhotos calls, deterministically. Returns the FULL ordered
  // candidate LIST now (see that function's own doc comment for why a
  // single "most preferred" URL isn't enough — a candidate can fail at
  // fetch time independently of preference order), so every assertion here
  // checks the whole array, not just its first element. ---
  const fullPhoto = { src_lg: "LG", src: "SRC", src_facebook: "FB" }
  const arraysEqual = (a: string[], b: string[]): boolean =>
    a.length === b.length && a.every((v, i) => v === b[i])
  check(
    "resolveCategoryPhotoUrls: full candidate list, in order, when sharp is available",
    arraysEqual(resolveCategoryPhotoUrls(fullPhoto, true), ["LG", "SRC", "FB"])
  )
  check(
    "resolveCategoryPhotoUrls: skips null src_lg, keeping order for the rest",
    arraysEqual(
      resolveCategoryPhotoUrls({ src_lg: null, src: "SRC", src_facebook: "FB" }, true),
      ["SRC", "FB"]
    )
  )
  check(
    "resolveCategoryPhotoUrls: only src_facebook when src_lg and src are both null",
    arraysEqual(
      resolveCategoryPhotoUrls({ src_lg: null, src: null, src_facebook: "FB" }, true),
      ["FB"]
    )
  )
  check(
    "resolveCategoryPhotoUrls: SHARP UNAVAILABLE collapses to [src_facebook] only, even when src_lg/src are present",
    arraysEqual(resolveCategoryPhotoUrls(fullPhoto, false), ["FB"])
  )
  check(
    "resolveCategoryPhotoUrls: null category_photo resolves to [] regardless of sharp availability",
    arraysEqual(resolveCategoryPhotoUrls(null, true), []) &&
      arraysEqual(resolveCategoryPhotoUrls(null, false), [])
  )
  check(
    "resolveCategoryPhotoUrls: all-null category_photo (no candidates at all) resolves to []",
    arraysEqual(
      resolveCategoryPhotoUrls({ src_lg: null, src: null, src_facebook: null }, true),
      []
    )
  )

  // --- End-to-end multi-format check: sharp IS available in this
  // environment (confirmed by the earlier resize logs above using it), so a
  // product exposing all three URLs should fetch ONLY src_lg (the WEBP) —
  // never src or src_facebook — and successfully decode/resize it despite
  // the source being WEBP, not JPEG. ---
  const multiFormatProducts: PricelistExportProduct[] = [
    {
      id: 4,
      advanced_product: {
        id: 104,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Multi-format product" }],
        category_photo: {
          src_lg: `${base}/photo.webp`,
          src: `${base}/photo-src.png`,
          src_facebook: `${base}/photo.jpg`,
        },
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
        sofa_forms: [],
      },
    },
  ]
  const photoJpgCountBeforeMultiFormat = requestCounts.get("/photo.jpg") ?? 0
  const multiFormatPhotoBuffers = await fetchPricelistPhotos(multiFormatProducts)
  const webpEntry = multiFormatPhotoBuffers.get(`${base}/photo.webp`)
  check(
    "multi-format: src_lg (WEBP) is fetched and successfully resized (known width/height)",
    !!webpEntry && webpEntry.width != null && webpEntry.height != null
  )
  check(
    "multi-format: resized WEBP source is re-encoded to JPEG (extension === 'jpeg')",
    webpEntry?.extension === "jpeg"
  )
  check(
    "multi-format: src (PNG fallback) was NEVER requested — src_lg took priority",
    !requestCounts.has("/photo-src.png")
  )
  check(
    "multi-format: src_facebook (JPEG last-resort) was NEVER requested — src_lg took priority",
    requestCounts.get("/photo.jpg") === photoJpgCountBeforeMultiFormat
  )

  // --- W1 regression check: candidate 1 (src_lg) fails at the HTTP layer
  // (403 — mirrors real ALVAR data), candidate 2 (src) is served fine. The
  // pool must fall through to candidate 2 rather than giving up the whole
  // photo the moment the preferred candidate fails — this is the exact
  // regression HEAD had before resolveCategoryPhotoUrls returned a list. ---
  const fallbackProducts: PricelistExportProduct[] = [
    {
      id: 5,
      advanced_product: {
        id: 105,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Fallback-chain product" }],
        category_photo: {
          src_lg: `${base}/photo-403.webp`,
          src: `${base}/photo-src.png`,
          src_facebook: `${base}/photo.jpg`,
        },
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
        sofa_forms: [],
      },
    },
  ]
  const photoSrcPngCountBefore = requestCounts.get("/photo-src.png") ?? 0
  const fallbackPhotoBuffers = await fetchPricelistPhotos(fallbackProducts)
  check(
    "W1: candidate 1 (src_lg, 403) resolves to a null map entry, not left unattempted",
    fallbackPhotoBuffers.get(`${base}/photo-403.webp`) === null
  )
  check(
    "W1: candidate 2 (src) was fetched and successfully resized after candidate 1 failed",
    (() => {
      const entry = fallbackPhotoBuffers.get(`${base}/photo-src.png`)
      return !!entry && entry.width != null && entry.height != null
    })()
  )
  check(
    "W1: candidate 3 (src_facebook) was NEVER requested — candidate 2 already succeeded",
    (requestCounts.get("/photo.jpg") ?? 0) === photoJpgCountBeforeMultiFormat
  )
  check(
    "W1: candidate 2 (src) was requested exactly once for this product",
    requestCounts.get("/photo-src.png") === photoSrcPngCountBefore + 1
  )

  // --- Cross-validator check: the whole risk of the image-fetch.ts extraction ---
  const crossProducts: PricelistExportProduct[] = [
    {
      id: 3,
      advanced_product: {
        id: 103,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Cross-check product" }],
        // Genuinely non-image content (plain text) served as the "category
        // photo" URL -- the photo pool's validator (isEmbeddableSourceImage,
        // now that it accepts jpeg/png/webp — see resolveCategoryPhotoUrl's
        // multi-format support above) must STILL reject non-image content.
        // A real PNG here would no longer prove anything: accepting a PNG
        // at this pool is now correct, intentional behaviour (see the
        // multi-format checks above), not a validator leak.
        category_photo: { src_lg: null, src: null, src_facebook: `${base}/notanimage` },
        advanced_product_price_fabric_category: [],
        additional_component_to_advanced_product: [],
        sofa_forms: [
          {
            id: 5,
            name: "Cross-check module",
            code: "X1",
            dimensions: null,
            package_dimensions: [],
            form_price_fabric_category: [],
            // A JPEG served as a "blueprint" URL -- the PNG pool's isPng
            // validator MUST reject it.
            blueprint: {
              status: "rendered",
              thumbnail_url: `${base}/photo.jpg`,
              thumb_width: 50,
              thumb_height: 50,
            },
          },
        ],
      },
    },
  ]
  const crossPhotoBuffers = await fetchPricelistPhotos(crossProducts)
  const crossBlueprintBuffers = await fetchPricelistBlueprints(crossProducts)
  check(
    "CROSS-VALIDATION: photo pool rejects genuinely non-image content served at the photo URL",
    crossPhotoBuffers.get(`${base}/notanimage`) === null
  )
  check(
    "CROSS-VALIDATION: PNG pool rejects a real JPEG served at the blueprint URL",
    crossBlueprintBuffers.get(`${base}/photo.jpg`) === null
  )

  server.close()

  console.log(`\n${failed === 0 ? "ALL PASSED" : `${failed} CHECK(S) FAILED`}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
