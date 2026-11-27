// Unit checks for the REST v1 slices 2, 4 and 5 (product page, configurator,
// taxonomy, CMS pages, settings, public forms): the product-page adapter,
// the prices-disabled configurator exception, the private-page decision,
// the settings derivations, the form error mapping and the client
// additions (JSON POST, field errors, Retry-After, the narrowed acting
// retry). No backend, no network: fetch is a stub.
// Run with: pnpm verify:cms-v1
// Exits 0 when every case passes, 1 otherwise.
import {
  selectConfiguratorTransport,
  selectV1Transport,
} from "../src/lib/data/v1-transport-rule"
import {
  mapV1ProductDetail,
  type V1ProductDetail,
} from "../src/lib/furnisystems-sdk/modules/products/v1-detail-adapter"
import {
  classifyV1PageError,
  emailSignupErrorCode,
  lowStockThresholdOf,
  newBadgeDaysOf,
  pageResultForOutcome,
  partnerRequestBody,
  partnerRequestError,
  pricelistSettingsOf,
} from "../src/lib/furnisystems-sdk/modules/pages/v1-adapter"
import { isPrivatePageResult } from "../src/lib/furnisystems-sdk/modules/pages/types"
import {
  V1ProblemError,
  v1DataGet,
  v1DataPost,
  withActingRetryIfStale,
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

const img = (id: number) => ({
  id,
  src: `s${id}.png`,
  srcMd: `m${id}.webp`,
  srcXs: null,
  srcThumbnail: `t${id}.webp`,
  displayOrder: id,
})

const detail: V1ProductDetail = {
  id: 1898,
  type: "ADVANCED_PRODUCT",
  reference: "ALPINE - ALPINE",
  contentBlocks: [
    {
      id: 77,
      type: "text_and_image",
      style: "default",
      videoLink: null,
      videoType: null,
      videoAutoplay: false,
      videoLoop: false,
      arrangement: 2,
      mainImage: { id: 9, src: "main.png" },
      galleryImages: [{ id: 10, src: "g.png", displayOrder: 1 }],
      profiles: [
        { id: 1, name: "Title", description: "d", descriptionFormat: "html", link: null, language: "en" },
      ],
      defaultMargins: true,
      maxHeight: null,
      maxWidth: 500,
      minHeight: null,
      minWidth: null,
      topMargin: null,
      bottomMargin: null,
      leftMargin: null,
      rightMargin: null,
      backgroundColor: "#fff",
      textColor: null,
      mediaMaxHeight: null,
      mediaMaxWidth: null,
      mediaMinHeight: null,
      mediaMinWidth: null,
      objectFitCover: true,
      linkNewTab: false,
      linkPage: { id: "pg1", profiles: [{ slug: "about", language: "en" }] },
      extraCss: { color: "red" },
      linkedItems: [{ id: 3, title: "t", link: "/x", arrangement: 0, image: { id: 4, src: "i.png" } }],
      config: { display: "row" },
    },
  ],
  singleProduct: null,
  advancedProduct: {
    id: 1292,
    advancedProductType: "SOFA",
    profiles: [{ name: "Alpine", description: "desc", language: "en", permalink: "alpine-alpine-1" }],
    categoryPhoto: img(5),
    galleryPhotos: [img(6), img(7)],
    components: [
      {
        id: 50,
        isWrapper: true,
        code: "BICHON:1L.1Z",
        group: { id: 8, code: "design-comfort", profiles: [{ name: "Design / Comfort", language: "en" }] },
        profiles: [{ name: "Wrapper", description: null, language: "en" }],
        image: { src: "c.png", srcMd: "cm.png", srcXs: null },
        linkedComponents: [
          {
            id: 3125,
            linkType: "INCLUDES",
            displayOrder: 1,
            targetComponent: {
              id: 1685,
              code: "C",
              profiles: [{ name: "C/NP", description: "soft", language: "en" }],
              // minimal target (backend 2bb05ed): no group, no srcXs
              image: { src: "k.png", srcMd: "km.png" },
            },
          },
        ],
      },
    ],
  },
  categories: [{ code: "SOFAS" }, { code: null }],
  primaryCategory: {
    id: 63,
    code: "SOFAS",
    isRootCategory: false,
    profiles: [{ name: "Sofas", language: "en", permalink: "sofas" }],
    parentCategory: {
      id: 62,
      isRootCategory: false,
      profiles: [{ name: "Soft", language: "en", permalink: "" }],
      parentCategory: {
        id: 1,
        isRootCategory: true,
        profiles: [{ name: "All", language: "en", permalink: "all" }],
        parentCategory: null,
      },
    },
  },
  features: [
    { photo: { srcXs: null, src: "f.png" }, profiles: [{ name: "Feature", description: "x", language: "en" }] },
  ],
  linkedProducts: [
    {
      linkType: "GOES_WELL_WITH",
      displayOrder: 0,
      product: {
        id: 1899,
        createdAt: "2024-01-01T00:00:00.000Z",
        type: "ADVANCED_PRODUCT",
        reference: "ALPS",
        discount: null,
        singleProduct: null,
        advancedProduct: {
          id: 1293,
          priceFrom: 99,
          categoryPhoto: img(11),
          profiles: [{ id: 2, name: "Alps", language: "en", permalink: "alps-alps-1" }],
        },
        primaryCategory: { id: 63, profiles: [{ name: "Sofas", language: "en" }] },
      },
    },
  ],
}

async function main() {
  console.log("Configurator transport (prices-disabled exception)")
  assert("graphql transport -> graphql", selectConfiguratorTransport("graphql", true) === "graphql")
  assert("v1, prices enabled -> v1", selectConfiguratorTransport("v1", true) === "v1")
  assert("v1, guest / unknown (null) -> v1", selectConfiguratorTransport("v1", null) === "v1")
  assert("v1, undefined -> v1", selectConfiguratorTransport("v1", undefined) === "v1")
  assert("v1, prices DISABLED -> graphql", selectConfiguratorTransport("v1", false) === "graphql")
  assert("rule composes with the shared rule (legacy-only -> graphql)",
    selectConfiguratorTransport(selectV1Transport("anonymous", true), true) === "graphql")

  console.log("Product page adapter")
  const p = mapV1ProductDetail(detail)
  assert("id / type / reference", p.id === 1898 && p.type === "ADVANCED_PRODUCT" && p.reference === "ALPINE - ALPINE")
  assert("single_product null", p.single_product === null)
  assert("profiles keep the flat permalink",
    eq(p.advanced_product?.advanced_product_profiles, [
      { name: "Alpine", description: "desc", language: "en", permalink: "alpine-alpine-1" },
    ]))
  assert("advanced_product_type", p.advanced_product?.advanced_product_type === "SOFA")
  assert("category_photo snake_case",
    eq(p.advanced_product?.category_photo, {
      id: 5, src: "s5.png", src_md: "m5.webp", src_xs: null, src_thumbnail: "t5.webp", display_order: 5,
    }))
  assert("gallery_photos mapped in order", p.advanced_product?.gallery_photos.map((g) => g.id).join() === "6,7")
  const assoc = p.advanced_product?.additional_component_to_advanced_product ?? []
  const comp = assoc[0]?.additional_component
  assert("components re-wrapped as additional_component_to_advanced_product[].additional_component",
    assoc.length === 1 && comp?.id === 50 && comp.is_wrapper === true && comp.code === "BICHON:1L.1Z")
  assert("component group",
    eq(comp?.additional_component_group, {
      id: 8, code: "design-comfort",
      additional_component_group_profiles: [{ name: "Design / Comfort", language: "en" }],
    }))
  assert("component image", eq(comp?.image, { src: "c.png", src_md: "cm.png", src_xs: null }))
  const link = comp?.linked_components_source?.[0]
  assert("linked component snake_case",
    link?.id === 3125 && link.link_type === "INCLUDES" && link.display_order === 1 &&
    link.target_component.id === 1685 && link.target_component.code === "C" &&
    eq(link.target_component.additional_component_profiles, [{ name: "C/NP", description: "soft", language: "en" }]) &&
    eq(link.target_component.image, { src: "k.png", src_md: "km.png", src_xs: null }))
  assert("linked target has no group (v1 does not serve it)",
    link?.target_component.additional_component_group === undefined)
  assert("categories codes", eq(p.categories, [{ code: "SOFAS" }, { code: null }]))
  const pc = p.primary_category
  assert("primary category: permalink -> meta_information.permalink",
    pc?.id === 63 && pc.code === "SOFAS" && pc.is_root_category === false &&
    eq(pc.category_profiles, [{ name: "Sofas", language: "en", meta_information: { permalink: "sofas" } }]))
  assert("empty permalink -> meta_information null",
    eq(pc?.parent_category?.category_profiles, [{ name: "Soft", language: "en", meta_information: null }]))
  assert("grandparent level, no deeper key",
    pc?.parent_category?.parent_category?.id === 1 &&
    pc.parent_category.parent_category.is_root_category === true &&
    !("parent_category" in (pc.parent_category.parent_category as object)))
  assert("features re-wrapped as product_features[].product_feature",
    eq(p.product_features, [
      { product_feature: { photo: { src_xs: null, src: "f.png" },
        product_feature_profiles: [{ name: "Feature", description: "x", language: "en" }] } },
    ]))
  const lp = p.linked_products_as_source?.[0]
  assert("linked products -> linked_products_as_source with a mapped card",
    lp?.link_type === "GOES_WELL_WITH" && lp.display_order === 0 && lp.target_product.id === 1899 &&
    lp.target_product.advanced_product?.price_from === 99 &&
    lp.target_product.advanced_product?.advanced_product_profiles[0].meta_information.permalink === "alps-alps-1")
  const cb = p.content_blocks?.[0] as any
  assert("content block camelCase -> snake_case",
    cb.id === 77 && cb.type === "text_and_image" && cb.video_autoplay === false && cb.arrangement === 2 &&
    eq(cb.main_image, { id: 9, src: "main.png" }) &&
    eq(cb.gallery_images, [{ id: 10, src: "g.png", display_order: 1 }]) &&
    eq(cb.content_block_profiles, [{ id: 1, name: "Title", description: "d", description_format: "html", link: null, language: "en" }]) &&
    cb.default_margins === true && cb.max_width === 500 && cb.background_color === "#fff" &&
    cb.object_fit_cover === true && cb.link_new_tab === false &&
    eq(cb.link_page, { id: "pg1", page_profiles: [{ slug: "about", language: "en" }] }) &&
    eq(cb.extra_css, { color: "red" }) &&
    eq(cb.linked_items, [{ id: 3, title: "t", link: "/x", arrangement: 0, image: { id: 4, src: "i.png" } }]) &&
    eq(cb.config, { display: "row" }))
  assert("content block has no grid_product_containers (v1 grids by block id)", !("grid_product_containers" in cb))
  const single = mapV1ProductDetail({
    ...detail,
    type: "SINGLE_PRODUCT",
    advancedProduct: null,
    singleProduct: {
      id: 4,
      profiles: [{ name: "Lamp", description: null, shortDescription: "short", language: "en", permalink: "lamp" }],
      categoryPhoto: null,
      galleryPhotos: [],
    },
    primaryCategory: null,
    linkedProducts: [],
    features: [],
    contentBlocks: [],
  })
  assert("single product: short_description kept, nulls stay null",
    eq(single.single_product?.product_profiles, [
      { name: "Lamp", description: null, short_description: "short", language: "en", permalink: "lamp" },
    ]) && single.single_product?.category_photo === null && single.primary_category === null &&
    single.advanced_product === null)

  console.log("Private CMS page decision")
  assert("401 PRIVATE_PAGE -> private", classifyV1PageError(401, "PRIVATE_PAGE") === "private")
  assert("private -> the PRIVATE_PAGE sentinel (page redirects to login with returnTo)",
    isPrivatePageResult(pageResultForOutcome("private") as any))
  assert("404 -> not-found -> null", classifyV1PageError(404, "NOT_FOUND") === "not-found" &&
    pageResultForOutcome("not-found") === null)
  assert("other 401 -> GraphQL fallback", classifyV1PageError(401, "UNAUTHENTICATED") === "fallback" &&
    classifyV1PageError(401, null) === "fallback" && pageResultForOutcome("fallback") === undefined)
  assert("403 / 429 / 503 / network -> error (fail closed, not cached)",
    ["403", "429", "503", "0", "500"].every((s) => classifyV1PageError(Number(s), null) === "error") &&
    pageResultForOutcome("error") === undefined)
  assert("a 404 with code PRIVATE_PAGE is still not-found", classifyV1PageError(404, "PRIVATE_PAGE") === "not-found")

  console.log("Settings derivations")
  assert("new_badge_days positive kept", newBadgeDaysOf({ new_badge_days: 180 }) === 180)
  assert("new_badge_days 0 / null / missing -> 0",
    newBadgeDaysOf({ new_badge_days: 0 }) === 0 && newBadgeDaysOf({ new_badge_days: null }) === 0 &&
    newBadgeDaysOf({}) === 0 && newBadgeDaysOf(null) === 0)
  assert("low-stock threshold served / default 50",
    lowStockThresholdOf({ fabric_low_stock_threshold: 12 }) === 12 && lowStockThresholdOf({}) === 50)
  assert("pricelist settings full",
    eq(pricelistSettingsOf({
      pricelist_export_enabled: true, pricelist_cover_enabled: true, pricelist_cover_terms: "  t  ",
      pricelist_cover_component_group_ids: [3, 1], pricelist_cover_image: { src: " c.png " },
      default_manufacturer: { logo_image: { src: "logo.png" } },
    }, "/fallback.svg"), {
      exportEnabled: true, coverEnabled: true, coverImageUrl: "c.png", coverTerms: "t",
      coverComponentGroupIds: [3, 1], logoUrl: "logo.png",
    }))
  assert("pricelist settings defaults",
    eq(pricelistSettingsOf({ pricelist_cover_terms: null, pricelist_cover_image: null }, "/fallback.svg"), {
      exportEnabled: false, coverEnabled: false, coverImageUrl: null, coverTerms: "",
      coverComponentGroupIds: [], logoUrl: "/fallback.svg",
    }))

  console.log("Form error mapping")
  assert("email 400 on body.email -> invalid-email",
    emailSignupErrorCode({ status: 400, errors: [{ path: "body.email", message: "x" }] }) === "invalid-email")
  assert("email 400 elsewhere -> generic",
    emailSignupErrorCode({ status: 400, errors: [{ path: "body.contentBlockId", message: "x" }] }) === "generic")
  assert("email 429 / 503 / network -> later",
    [429, 503, 0].every((s) => emailSignupErrorCode({ status: s }) === "later"))
  assert("email 404 / 422 / 403 -> generic",
    [404, 422, 403].every((s) => emailSignupErrorCode({ status: s }) === "generic"))
  assert("partner 400 on contactEmail -> fieldErrors",
    eq(partnerRequestError({ status: 400, errors: [{ path: "body.contactEmail", message: "x" }] }),
      { fieldErrors: { contactEmail: "invalid" } }))
  assert("partner 400 on companyName + contactEmail -> both fields",
    eq(Object.keys(partnerRequestError({ status: 400, errors: [
      { path: "body.companyName", message: "x" }, { path: "body.contactEmail", message: "y" }] }).fieldErrors ?? {}),
      ["companyName", "contactEmail"]))
  assert("partner 400 on a field the form cannot mark -> failed",
    eq(partnerRequestError({ status: 400, errors: [{ path: "body.vatCode", message: "x" }] }), { errorCode: "failed" }))
  assert("partner 429 / 503 / network -> error (try again later)",
    [429, 503, 0].every((s) => partnerRequestError({ status: s }).errorCode === "error"))
  assert("partner 422 / 403 -> failed", [422, 403].every((s) => partnerRequestError({ status: s }).errorCode === "failed"))
  assert("partner body: declared keys only, empty / null omitted, trimmed, no recipient",
    eq(partnerRequestBody({
      companyName: " ACME ", companyCode: "", vatCode: null, country: "LT", message: "hi\nthere",
      expectedTurnover: undefined, contactEmail: "a@b.co", recipient: "evil@x.com",
    }), { companyName: "ACME", country: "LT", message: "hi\nthere", contactEmail: "a@b.co" }))

  console.log("v1 client: JSON POST, problem details, narrowed acting retry")
  const calls: { url: string; init: any }[] = []
  const okFetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }) as typeof fetch
  const deps = { restApiUrl: "http://be/api", fetch: okFetch, bffHeaders: async () => ({ "x-client-ip": "1.2.3.4" }) }
  await v1DataPost(deps, { path: "/public/email-signup", body: { contentBlockId: 5, email: "a@b.co" } })
  const c = calls[0]
  assert("POST to /api/v1 path", c.url === "http://be/api/v1/public/email-signup" && c.init.method === "POST")
  assert("JSON body + Content-Type", c.init.headers["Content-Type"] === "application/json" &&
    c.init.body === JSON.stringify({ contentBlockId: 5, email: "a@b.co" }))
  assert("BFF headers, no Authorization for a guest, no-store",
    c.init.headers["x-client-ip"] === "1.2.3.4" && !("Authorization" in c.init.headers) && c.init.cache === "no-store")
  await v1DataPost(deps, { path: "/x", bearer: "tok" })
  assert("bodyless POST keeps no body / Content-Type", calls[1].init.body === undefined &&
    !("Content-Type" in calls[1].init.headers) && calls[1].init.headers.Authorization === "Bearer tok")

  const problemFetch = (async () =>
    new Response(JSON.stringify({ code: "VALIDATION_FAILED", errors: [{ path: "body.email", message: "bad" }, { nope: 1 }] }), {
      status: 400, headers: { "retry-after": "30" } })) as typeof fetch
  try {
    await v1DataPost({ ...deps, fetch: problemFetch }, { path: "/x", body: {} })
    assert("400 throws", false)
  } catch (e) {
    const pe = e as V1ProblemError
    assert("400 -> V1ProblemError with field errors (malformed entries dropped)",
      pe.status === 400 && pe.code === "VALIDATION_FAILED" && eq(pe.errors, [{ path: "body.email", message: "bad" }]))
    assert("Retry-After parsed", pe.retryAfter === 30)
  }
  const privateFetch = (async () =>
    new Response(JSON.stringify({ code: "PRIVATE_PAGE", status: 401 }), { status: 401 })) as typeof fetch
  try {
    await v1DataGet({ ...deps, fetch: privateFetch }, { path: "/catalog/pages/by-path", query: { path: "a", language: "en" } })
  } catch (e) {
    const pe = e as V1ProblemError
    assert("401 PRIVATE_PAGE surfaces its code", pe.status === 401 && pe.code === "PRIVATE_PAGE" &&
      classifyV1PageError(pe.status, pe.code) === "private")
  }

  const mk = (status: number, actingSent: boolean, code: string | null = status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : null) =>
    new V1ProblemError({ status, actingSent, code })
  let seen: (number | null)[] = []
  let dropped = 0
  const run = (fail: V1ProblemError | null, stale: boolean) => {
    seen = []
    dropped = 0
    return withActingRetryIfStale(
      7,
      async (acting) => {
        seen.push(acting)
        if (acting !== null && fail) throw fail
        return "ok"
      },
      async () => stale,
      () => { dropped++ }
    )
  }
  assert("no acting -> one call", (await withActingRetryIfStale(null, async (a) => String(a), async () => true, () => {})) === "null")
  assert("success with acting -> one call", (await run(null, false)) === "ok" && eq(seen, [7]))
  let threw = false
  try { await run(mk(403, true), true) } catch (e) { threw = (e as V1ProblemError).status === 403 }
  assert("403 FORBIDDEN with acting -> thrown, NO retry in the agent's own scope, cookie kept",
    threw && eq(seen, [7]) && dropped === 0)
  threw = false
  try { await run(mk(404, true, null), true) } catch (e) { threw = (e as V1ProblemError).status === 404 }
  assert("404 without a problem code (not the v1 app) -> thrown, no staleness check",
    threw && eq(seen, [7]) && dropped === 0)
  threw = false
  try { await run(mk(404, true), false) } catch (e) { threw = (e as V1ProblemError).status === 404 }
  assert("404 with acting, acting NOT stale -> 404 stands (no agent view, cookie kept)",
    threw && eq(seen, [7]) && dropped === 0)
  assert("404 with acting, acting stale -> cookie dropped, retry without",
    (await run(mk(404, true), true)) === "ok" && eq(seen, [7, null]) && dropped === 1)
  threw = false
  try { await run(mk(503, true), true) } catch (e) { threw = (e as V1ProblemError).status === 503 }
  assert("503 -> thrown, no retry", threw && eq(seen, [7]))

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
