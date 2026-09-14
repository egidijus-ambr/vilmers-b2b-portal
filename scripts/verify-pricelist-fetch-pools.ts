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
import { fetchPricelistPhotos } from "../src/lib/util/pricelist-photos"
import { fetchPricelistBlueprints } from "../src/lib/util/pricelist-blueprints"
import type { PricelistExportProduct } from "../src/lib/furnisystems-sdk/modules/products/types"

const REAL_PNG_PATH =
  "/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/blueprint-preview/32256-CORNERCUTL-thumb.png"
const realPngBytes = fs.readFileSync(REAL_PNG_PATH)

// Synthetic but byte-signature-valid JPEG: isJpeg only checks the 3-byte SOI
// marker (FF D8 FF), so this is honest coverage of what's actually
// validated without needing a full decodable image.
const syntheticJpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9,
])

const requestCounts = new Map<string, number>()

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = req.url ?? "/"
  requestCounts.set(url, (requestCounts.get(url) ?? 0) + 1)

  if (url === "/photo.jpg") {
    res.writeHead(200, { "Content-Type": "image/jpeg" })
    res.end(syntheticJpegBytes)
  } else if (url === "/thumb.png") {
    res.writeHead(200, { "Content-Type": "image/png" })
    res.end(realPngBytes)
  } else if (url === "/notanimage") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("hello world, definitely not an image")
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
        category_photo: { src_facebook: `${base}/photo.jpg` },
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
        category_photo: { src_facebook: `${base}/photo.jpg` },
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

  check(
    "photo pool: /photo.jpg fetched and accepted as JPEG",
    buffersEqual(photoBuffers.get(`${base}/photo.jpg`), syntheticJpegBytes)
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

  // --- Cross-validator check: the whole risk of the image-fetch.ts extraction ---
  const crossProducts: PricelistExportProduct[] = [
    {
      id: 3,
      advanced_product: {
        id: 103,
        advanced_product_type: "SOFA",
        advanced_product_profiles: [{ name: "Cross-check product" }],
        // A PNG served as the "category photo" URL -- the JPEG pool's
        // isJpeg validator MUST reject it.
        category_photo: { src_facebook: `${base}/thumb.png` },
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
    "CROSS-VALIDATION: JPEG pool rejects a real PNG served at the photo URL",
    crossPhotoBuffers.get(`${base}/thumb.png`) === null
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
