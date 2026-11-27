// Unit checks for the catalogue REST v1 slice (portal REST migration slice 1):
// the v1-vs-GraphQL transport rule, the v1 DTO -> portal-type adapter, and
// the v1 data client (query string, headers, no-store, problem+json, the
// acting-header retry). No backend, no network: fetch is a stub.
// Run with: pnpm verify:catalog-v1
//   (= node --conditions=react-server -r sucrase/register scripts/verify-catalog-v1.ts;
//    the react-server condition resolves `server-only` to its empty module.)
// Exits 0 when every case passes, 1 otherwise.
import { selectV1Transport as selectCatalogTransport } from "../src/lib/data/v1-transport-rule"
import {
  emptyFacets,
  emptyProductsPage,
  mapV1CategoryFacets,
  mapV1ProductCard,
  mapV1ProductCardPage,
  mapV1ProductNames,
  type V1ProductCard,
} from "../src/lib/furnisystems-sdk/modules/products/v1-adapter"
import {
  V1ProblemError,
  buildV1QueryString,
  v1DataGet,
  withActingRetry,
} from "../src/lib/furnisystems-sdk/client/v1-data"

let failures = 0
function assert(name: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${name}`)
  else {
    failures++
    console.log(`  FAIL: ${name}`)
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

async function main() {
  console.log("Transport rule")
  assert("v1 ok, legacy jwt -> v1", selectCatalogTransport("ok", true) === "v1")
  assert("v1 ok, no legacy jwt -> v1", selectCatalogTransport("ok", false) === "v1")
  assert("true guest (no v1, no jwt) -> v1", selectCatalogTransport("anonymous", false) === "v1")
  assert("legacy-only / impersonated (no v1, jwt) -> graphql",
    selectCatalogTransport("anonymous", true) === "graphql")
  assert("needs-refresh, jwt -> graphql", selectCatalogTransport("needs-refresh", true) === "graphql")
  assert("needs-refresh, no jwt -> graphql (not a true guest)",
    selectCatalogTransport("needs-refresh", false) === "graphql")

  console.log("Adapter: card")
  const advanced: V1ProductCard = {
    id: 1898,
    createdAt: "2024-12-06T12:15:22.808Z",
    type: "ADVANCED_PRODUCT",
    reference: "ALPINE - ALPINE",
    discount: null,
    singleProduct: null,
    advancedProduct: {
      id: 1292,
      priceFrom: 120,
      categoryPhoto: { id: 5, src: "a.png", srcMd: null, srcXs: "xs.webp", srcThumbnail: null, displayOrder: 0 },
      profiles: [
        { id: 7, name: "Alpine", language: "en", permalink: "alpine" },
        { id: 8, name: "Alpine FR", language: "fr", permalink: "alpine-fr" },
      ],
    },
    primaryCategory: { id: 3, profiles: [{ name: "Sofas", language: "en" }] },
  }
  const a = mapV1ProductCard(advanced)
  assert("ids/type/reference/createdAt kept",
    a.id === 1898 && a.type === "ADVANCED_PRODUCT" && a.reference === "ALPINE - ALPINE" &&
    a.createdAt === "2024-12-06T12:15:22.808Z")
  assert("single_product null", a.single_product === null)
  assert("price_from mapped", a.advanced_product?.price_from === 120)
  assert("profiles in every language, permalink -> meta_information.permalink",
    eq(a.advanced_product?.advanced_product_profiles, [
      { id: 7, name: "Alpine", language: "en", meta_information: { permalink: "alpine" } },
      { id: 8, name: "Alpine FR", language: "fr", meta_information: { permalink: "alpine-fr" } },
    ]))
  assert("image camelCase -> snake_case, null variants stay null",
    eq(a.advanced_product?.category_photo, {
      id: 5, src: "a.png", src_md: null, src_xs: "xs.webp", src_thumbnail: null, display_order: 0,
    }))
  assert("primary_category profiles",
    eq(a.primary_category, { id: 3, category_profiles: [{ name: "Sofas", language: "en" }] }))
  assert("no camelCase keys leak", !("advancedProduct" in (a as any)) && !("primaryCategory" in (a as any)))

  const single: V1ProductCard = {
    id: 2, createdAt: "2025-01-01T00:00:00.000Z", type: "SINGLE_PRODUCT", reference: null,
    discount: { id: 9, discount: 10, active: true, startDate: null, expiryDate: "2030-01-01T00:00:00.000Z" },
    singleProduct: { id: 4, price: null, categoryPhoto: null, profiles: [] },
    advancedProduct: null, primaryCategory: null,
  }
  const s = mapV1ProductCard(single)
  assert("prices disabled: price stays null (not 0)", s.single_product?.price === null)
  assert("null category_photo stays null", s.single_product?.category_photo === null)
  assert("discount mapped incl. null startDate",
    eq(s.discount, { id: 9, discount: 10, active: true, startDate: null, expiryDate: "2030-01-01T00:00:00.000Z" }))
  assert("null primary_category / reference", s.primary_category === null && s.reference === null)
  const nullAdv = mapV1ProductCard({ ...advanced, advancedProduct: { ...advanced.advancedProduct!, priceFrom: null } })
  assert("prices disabled: price_from stays null", nullAdv.advanced_product?.price_from === null)

  console.log("Adapter: page / names / facets")
  const page = mapV1ProductCardPage({
    data: [advanced, single],
    meta: { page: 2, pageSize: 28, totalCount: 30, totalPages: 2 },
  })
  assert("page envelope -> {numberOfPages, productsCount, sortedProductContainers}",
    page.numberOfPages === 2 && page.productsCount === 30 &&
    page.sortedProductContainers.length === 2 && page.sortedProductContainers[1].id === 2)
  const emptyPage = mapV1ProductCardPage({ data: [], meta: { page: 1, pageSize: 28, totalCount: 0, totalPages: 0 } })
  assert("empty page == the GraphQL failure shape", eq(emptyPage, emptyProductsPage()))
  const names = mapV1ProductNames({ data: [{ id: 2, name: "B" }, { id: 1, name: "B" }, { id: 3, name: "C" }], totalCount: 3 })
  assert("names derived from data in order (duplicates kept)",
    eq(names, { names: ["B", "B", "C"], products: [{ id: 2, name: "B" }, { id: 1, name: "B" }, { id: 3, name: "C" }], totalCount: 3 }))
  const facets = {
    attributeGroups: [{ id: 1, name: "Colour", attributes: [{ id: 11, name: "Red", count: 4 }] }],
    childCategories: [{ id: 5, name: "Corner", count: 2 }],
    totalCount: 6,
  }
  assert("facets map 1:1", eq(mapV1CategoryFacets(facets), facets))
  assert("empty facets shape", eq(emptyFacets(), { attributeGroups: [], childCategories: [], totalCount: 0 }))
  assert("empty factories return fresh objects", emptyProductsPage() !== emptyProductsPage())

  console.log("Client: query string")
  assert("drops undefined/null/false/''/[]; true -> 1; arrays comma-joined",
    buildV1QueryString({ language: "en", page: 2, a: undefined, b: null, new: false, c: "", attributeIds: [],
      categoryIds: [3, 4], showAll: true }) === "?language=en&page=2&categoryIds=3%2C4&showAll=1")
  assert("special characters encoded (search q)", buildV1QueryString({ q: "50% a&b" }) === "?q=50%25+a%26b")
  assert("empty query -> ''", buildV1QueryString({}) === "")

  console.log("Client: request")
  const calls: { url: string; init: RequestInit }[] = []
  const okFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } })
  }) as unknown as typeof fetch
  await v1DataGet({ restApiUrl: "http://x/api/", fetch: okFetch, bffHeaders: async () => ({ "x-bff-secret": "s", "x-client-ip": "1.2.3.4" }) },
    { path: "/catalog/categories/a%2Fb/products", query: { language: "en" }, bearer: "tok", actingCustomerId: 42 })
  const h = calls[0].init.headers as Record<string, string>
  assert("url = base + /v1 + path + query", calls[0].url === "http://x/api/v1/catalog/categories/a%2Fb/products?language=en")
  assert("cache: no-store", calls[0].init.cache === "no-store")
  assert("bearer, x-client, BFF and acting headers",
    h.Authorization === "Bearer tok" && h["x-client"] === "portal" && h["x-bff-secret"] === "s" &&
    h["x-client-ip"] === "1.2.3.4" && h["X-Acting-Customer-Id"] === "42")
  calls.length = 0
  await v1DataGet({ restApiUrl: "http://x/api", fetch: okFetch, bffHeaders: async () => ({}) },
    { path: "/p", bearer: null, actingCustomerId: 0 })
  const g = calls[0].init.headers as Record<string, string>
  assert("guest: no Authorization, invalid acting id not sent", !("Authorization" in g) && !("X-Acting-Customer-Id" in g))

  const failWith = (status: number, body: string, ct = "application/problem+json") =>
    (async () => new Response(body, { status, headers: { "content-type": ct, "x-request-id": "rid-h" } })) as unknown as typeof fetch
  const caught = async (f: typeof fetch, acting: number | null = null) => {
    try {
      await v1DataGet({ restApiUrl: "http://x/api", fetch: f, bffHeaders: async () => ({}) }, { path: "/p", actingCustomerId: acting })
      return null
    } catch (e) {
      return e as V1ProblemError
    }
  }
  const p404 = await caught(failWith(404, JSON.stringify({ status: 404, code: "NOT_FOUND", requestId: "rid-b", detail: "Customer not found" })), 7)
  assert("problem+json -> V1ProblemError(status, code, requestId, actingSent)",
    p404 instanceof V1ProblemError && p404.status === 404 && p404.code === "NOT_FOUND" &&
    p404.requestId === "rid-b" && p404.actingSent === true)
  const p502 = await caught(failWith(502, "<html>bad gateway</html>", "text/html"))
  assert("non-JSON 502 -> V1ProblemError 502, request id from header",
    p502?.status === 502 && p502.code === null && p502.requestId === "rid-h" && p502.actingSent === false)
  const pNet = await caught((async () => { throw new TypeError("fetch failed") }) as unknown as typeof fetch)
  assert("network error -> status 0", pNet?.status === 0)

  console.log("Client: acting retry")
  const run = async (failStatus: number | null, retryOk = true, failCode: string | null = null) => {
    const seen: (number | null)[] = []
    let dropped = 0
    let error: unknown = null
    let result: unknown = null
    try {
      result = await withActingRetry(
        42,
        async (acting) => {
          seen.push(acting)
          if (acting !== null && failStatus !== null)
            throw new V1ProblemError({ status: failStatus, actingSent: true, code: failCode })
          if (acting === null && !retryOk) throw new V1ProblemError({ status: 404, actingSent: false })
          return "ok"
        },
        () => { dropped++ }
      )
    } catch (e) {
      error = e
    }
    return { seen, dropped, error, result }
  }
  const ok = await run(null)
  assert("success with acting: one call, no drop", eq(ok.seen, [42]) && ok.dropped === 0 && ok.result === "ok")
  const stale = await run(404)
  assert("404 with acting: retried without header, cookie dropped",
    eq(stale.seen, [42, null]) && stale.dropped === 1 && stale.result === "ok")
  const notAllowed = await run(403, true, "ACTING_NOT_ALLOWED")
  assert("403 ACTING_NOT_ALLOWED with acting: retried without header, cookie kept",
    eq(notAllowed.seen, [42, null]) && notAllowed.dropped === 0 && notAllowed.result === "ok")
  const forbidden = await run(403, true, "FORBIDDEN")
  assert("403 FORBIDDEN with acting: NOT retried (no own-scope answer), thrown, cookie kept",
    eq(forbidden.seen, [42]) && forbidden.dropped === 0 && (forbidden.error as V1ProblemError)?.status === 403)
  const forbiddenNoCode = await run(403)
  assert("403 without a code (a proxy): NOT retried, thrown",
    eq(forbiddenNoCode.seen, [42]) && (forbiddenNoCode.error as V1ProblemError)?.status === 403)
  const realNotFound = await run(404, false)
  assert("404 both with and without acting (e.g. unknown block): cookie kept, error thrown",
    realNotFound.dropped === 0 && (realNotFound.error as V1ProblemError)?.status === 404)
  const unavailable = await run(503)
  assert("503 with acting: no retry, thrown", eq(unavailable.seen, [42]) && (unavailable.error as V1ProblemError)?.status === 503)
  const noActing: (number | null)[] = []
  await withActingRetry(null, async (acting) => { noActing.push(acting); return 1 }, () => {})
  assert("no acting id: single call without header", eq(noActing, [null]))
  const throwingDrop = await withActingRetry(
    42,
    async (acting) => { if (acting) throw new V1ProblemError({ status: 404, actingSent: true }); return "ok" },
    () => { throw new Error("cookies are read-only in a render") }
  )
  assert("a failing cookie drop (render) is ignored", throwingDrop === "ok")

  if (failures > 0) {
    console.log(`\n${failures} failure(s)`)
    process.exit(1)
  }
  console.log("\nAll cases passed")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
