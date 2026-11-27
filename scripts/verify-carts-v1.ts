// Unit checks for portal REST slices 8/9 (carts, cart lines, cart offers on
// REST v1, backend 13c1182): the DTO -> portal-type adapters (the fields the
// GraphQL checkout builds createNewOrder from), the add-item body, the offer
// query, the v1 client's PATCH / DELETE / problem `items`, the v1 branch of
// toActionError, and the real request functions of src/lib/data/carts-v1.ts
// (paths, methods, bodies, X-Acting-Customer-Id on EVERY call, no retry).
// No backend, no network: fetch is a stub.
// Run with: pnpm verify:carts-v1
//   (= node --conditions=react-server -r sucrase/register scripts/verify-carts-v1.ts)
// Exits 0 when every case passes, 1 otherwise.

// `@lib/*` for src/lib/data/carts-v1.ts (sucrase does not read tsconfig paths).
const Module = require("module")
const nodePath = require("path")
const srcLib = nodePath.join(__dirname, "..", "src", "lib")
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request: string, ...rest: unknown[]) {
  const mapped = request.startsWith("@lib/") ? nodePath.join(srcLib, request.slice(5)) : request
  return originalResolve.call(this, mapped, ...rest)
}

import {
  mapV1Cart,
  mapV1CartItem,
  mapV1CartOffer,
  mapV1CartSummaries,
  toV1AddCartItemBody,
  v1CartOfferQuery,
  v1CartPathId,
  type V1Cart,
  type V1CartItem,
} from "../src/lib/furnisystems-sdk/modules/cart/v1-adapter"
import {
  V1ProblemError,
  isActingNotAllowed,
  v1DataDelete,
  v1DataPatch,
  v1DataPost,
} from "../src/lib/furnisystems-sdk/client/v1-data"
import { FABRIC_NOT_IN_PALETTE, toActionError } from "../src/lib/fabric-palettes/palette-error"
import type { AddCartItemInput } from "../src/lib/furnisystems-sdk/modules/cart/types"

let failures = 0
function assert(name: string, cond: boolean) {
  if (cond) console.log(`  PASS: ${name}`)
  else {
    failures++
    console.log(`  FAIL: ${name}`)
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const item: V1CartItem = {
  id: 501,
  quantity: 2,
  price: 1234.5,
  volume: 1.2,
  reference: "Room 4",
  productType: "ADVANCED_PRODUCT",
  advancedProductType: "SOFA",
  fabricCode: "F-1",
  fabricGroupName: "Velvet",
  fabricColorName: "Blue",
  selectedSofaCombinations: "[[{\"id\":9}]]",
  componentsByModule: [{ additionalComponentId: 77, groupCode: "legs" }],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z",
  product: {
    id: 900,
    type: "ADVANCED",
    advancedProduct: {
      id: 901,
      images: [{ id: 1, src: "a.jpg", srcXs: "a-xs.jpg", srcThumbnail: "a-t.jpg" }],
      categoryPhoto: { id: 2, src: "c.jpg", srcMd: "c-md.jpg", srcXs: null, srcThumbnail: "c-t.jpg" },
      profiles: [{ id: 3, name: "Aalter", language: "en" }],
      dimensions: { width: 200, tableExtendedLength: 10, seatHeight: null },
    },
  },
  fabric: { id: 31, code: "F-1", colorName: "Blue" },
  fabricGroup: { id: 41, code: "VEL", type: "FABRIC", profiles: [] },
  fabricCombination: { id: 51, image: { src: "comb.jpg" } },
  fabrics: [
    {
      id: 61,
      fabricCode: "F-2",
      fabricColorName: "Red",
      fabricGroupName: "Linen",
      fabric: { id: 32, code: "F-2", colorName: "Red", image: { src: "f.jpg", srcThumbnail: "f-t.jpg" } },
      fabricGroup: { id: 42, code: "LIN", type: "FABRIC", profiles: [{ id: 1, name: "Linen", language: "en" }] },
      combinationOption: { id: 71, profiles: [{ id: 1, name: "Seat", language: "en" }] },
    },
  ],
  components: [
    {
      id: 77,
      code: "LEG-1",
      isWrapper: false,
      groupId: 8,
      profiles: [{ id: 1, name: "Oak leg", materialName: "Oak", language: "en" }],
      color: { id: 5, hex: "#000", background: null },
      dimensions: { width: 3, height: 12, length: null },
      group: { id: 8, code: "legs", profiles: [{ id: 1, name: "Legs", language: "en" }] },
      linked: [{ id: 1, displayOrder: 2, linkType: "LEG", target: { id: 78, code: "LEG-2", image: null, profiles: [] } }],
    },
  ],
  sofaForms: [{ id: 81, name: "Corner", code: "C1" }],
}

const cart: V1Cart = {
  id: 12,
  name: null,
  isActive: true,
  isModified: true,
  customerId: 42,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-03T00:00:00.000Z",
  items: [item],
}

type Seen = { url: string; method: string; headers: Record<string, string>; body: string | undefined }

function stubFetch(answer: (s: Seen) => Response, seen: Seen[]): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    const s: Seen = {
      url: String(url),
      method: String(init.method),
      headers: { ...(init.headers as Record<string, string>) },
      body: init.body as string | undefined,
    }
    seen.push(s)
    return answer(s)
  }) as unknown as typeof fetch
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

async function main() {
  console.log("Adapter: cart / item (checkout-critical fields)")
  const c = mapV1Cart(cart)
  const i = c.items[0]
  assert("cart fields + isModified", c.id === 12 && c.customerId === 42 && c.isActive && c.isModified === true && c.name === null)
  assert("item cartId stamped from the cart", i.cartId === 12)
  assert("productContainerId = product.id (number)", i.productContainerId === 900)
  assert("fabric / fabric_group -> {id} numbers", eq(i.fabric, { id: 31 }) && eq(i.fabric_group, { id: 41 }))
  assert("fabricCombination.id kept (number)", i.fabricCombination?.id === 51 && i.fabricCombination?.image?.src === "comb.jpg")
  const f = i.cartItemFabrics[0]
  assert("cartItemFabrics: numeric fabric / group / option ids (buildAdvancedProductData)",
    f.id === 61 && f.fabric?.id === 32 && f.fabric_group?.id === 42 && f.combination_option?.id === 71)
  assert("cartItemFabrics snapshots", f.fabric_code === "F-2" && f.fabric_color_name === "Red" && f.fabric_group_name === "Linen")
  assert("additional_components[].id + group + linked",
    i.additional_components[0].id === 77 &&
    i.additional_components[0].additional_component_group?.code === "legs" &&
    i.additional_components[0].linked_components_source?.[0].target_component.id === 78 &&
    i.additional_components[0].linked_components_source?.[0].display_order === 2)
  assert("components_by_module kept", eq(i.components_by_module, [{ additionalComponentId: 77, groupCode: "legs" }]))
  assert("snake_case scalars", i.product_type === "ADVANCED_PRODUCT" && i.advanced_product_type === "SOFA" &&
    i.selected_sofa_combinations === "[[{\"id\":9}]]" && i.reference === "Room 4" && i.price === 1234.5 && i.quantity === 2)
  assert("advanced product: profiles, images, category photo, dimensions (GraphQL names)",
    i.product_container?.advanced_product?.advanced_product_profiles?.[0].name === "Aalter" &&
    i.product_container?.advanced_product?.images?.[0].src_thumbnail === "a-t.jpg" &&
    i.product_container?.advanced_product?.category_photo?.src_thumbnail === "c-t.jpg" &&
    i.product_container?.advanced_product?.category_photo?.display_order === 0 &&
    eq(i.product_container?.advanced_product?.dimensions, { width: 200, seat_height: null, table_extended_lengh: 10 }))
  assert("sofa_forms", eq(i.sofa_forms, [{ id: 81, name: "Corner", code: "C1" }]))
  assert("no metadata invented", !("metadata" in (i as unknown as Record<string, unknown>)))
  const bare = mapV1CartItem({ id: 1, quantity: null, price: null, volume: null, productType: "SINGLE_PRODUCT", createdAt: "x", updatedAt: "y" }, 3)
  assert("bare item: nulls / empty arrays, no crash",
    bare.product_container === null && bare.fabric === null && bare.fabric_group === null &&
    bare.cartItemFabrics.length === 0 && bare.additional_components.length === 0 && bare.productContainerId === null)
  assert("summaries", eq(mapV1CartSummaries({ data: [{ id: 1, name: "A", isActive: false, updatedAt: "u", itemCount: 3 }] }),
    [{ id: 1, name: "A", isActive: false, isModified: false, updatedAt: "u", itemCount: 3 }]))

  console.log("Add-item body (strict v1 schema: camelCase, no nulls, no zero ids)")
  const input: AddCartItemInput = {
    productContainerId: 900,
    product_type: "ADVANCED_PRODUCT",
    advanced_product_type: "SOFA",
    quantity: 1,
    price: 999.99,
    volume: 0,
    fabricId: 31,
    fabric_groupId: 41,
    fabricCombinationId: undefined,
    fabric_code: "",
    language: "en",
    selected_sofa_combinations: "[]",
    additionalComponentIds: [77, 0],
    componentsByModule: [{ additionalComponentId: 77, groupCode: "legs" }],
    cartItemFabrics: [
      { fabricId: 32, fabric_groupId: 42, combination_optionId: 71 },
      { fabricId: 33, fabric_groupId: undefined, combination_optionId: null as unknown as number },
    ],
    customerReference: "Room 4",
  }
  const body = toV1AddCartItemBody(input)
  assert("exact body", eq(body, {
    productContainerId: 900,
    productType: "ADVANCED_PRODUCT",
    advancedProductType: "SOFA",
    quantity: 1,
    price: 999.99,
    fabricId: 31,
    fabricGroupId: 41,
    language: "en",
    selectedSofaCombinations: "[]",
    additionalComponentIds: [77],
    componentsByModule: [{ additionalComponentId: 77, groupCode: "legs" }],
    cartItemFabrics: [{ fabricId: 32, fabricGroupId: 42, combinationOptionId: 71 }, { fabricId: 33 }],
    reference: "Room 4",
  }))
  assert("no null anywhere", !JSON.stringify(body).includes("null"))
  assert("price sent exactly as given (client-priced, unchanged)", body.price === 999.99)
  assert("minimal body", eq(toV1AddCartItemBody({ productContainerId: 5, product_type: "SINGLE_PRODUCT", quantity: 3 }),
    { productContainerId: 5, productType: "SINGLE_PRODUCT", quantity: 3 }))

  console.log("Offer query + mapping")
  assert("booleans as 'true'/'false', vatRate as text",
    eq(v1CartOfferQuery({ language: "dk", showPvm: false, showVolume: true, vatRate: 0.21 }),
      { language: "dk", showPvm: "false", showVolume: "true", vatRate: "0.21" }))
  const offer = mapV1CartOffer({
    context: { language: "en", showPvm: false, showVolume: true, vatRate: 0.21, logoUrl: null },
    items: [{ cartItemId: 1, reference: null, name: "A", imageUrl: null, moduleCombination: null, widthCm: 1, depthCm: null, heightCm: null,
      quantity: 1, volumeM3: null, totalNet: 10, manufacturer: null, bottoms: null, market: null, rawSofaCombinations: null,
      fabricSpecs: null as never, componentSpecs: [] }],
  })
  assert("offer passthrough, null spec arrays -> []", offer.items[0].totalNet === 10 && eq(offer.items[0].fabricSpecs, []))
  assert("path ids", v1CartPathId(12) === 12 && v1CartPathId(0) === null && v1CartPathId(1.5) === null && v1CartPathId("12") === null)

  console.log("Client: PATCH / DELETE / problem items")
  const deps = (stub: typeof globalThis.fetch) => ({ restApiUrl: "http://b/api", fetch: stub, bffHeaders: async () => ({}) })
  let seen: Seen[] = []
  const patched = await v1DataPatch<{ id: number }>(deps(stubFetch(() => json(200, { id: 1 }), seen)),
    { path: "/me/carts/12", body: { name: "N" }, bearer: "T", actingCustomerId: 42 })
  assert("PATCH: JSON body, Content-Type, bearer, acting header",
    patched.id === 1 && seen[0].method === "PATCH" && seen[0].url === "http://b/api/v1/me/carts/12" &&
    seen[0].body === "{\"name\":\"N\"}" && seen[0].headers["Content-Type"] === "application/json" &&
    seen[0].headers.Authorization === "Bearer T" && seen[0].headers["X-Acting-Customer-Id"] === "42")
  seen = []
  await v1DataDelete(deps(stubFetch(() => new Response(null, { status: 204 }), seen)), { path: "/me/carts/12", bearer: "T" })
  assert("DELETE 204: resolves, no body sent, no acting header when none",
    seen[0].method === "DELETE" && seen[0].body === undefined && !("Content-Type" in seen[0].headers) && !("X-Acting-Customer-Id" in seen[0].headers))
  seen = []
  await v1DataPost(deps(stubFetch(() => json(200, { id: 1 }), seen)), { path: "/me/carts/12/activate", bearer: "T" })
  assert("bodyless POST stays without Content-Type", seen[0].body === undefined && !("Content-Type" in seen[0].headers))
  let problem: V1ProblemError | null = null
  try {
    await v1DataPost(deps(stubFetch(() => json(422, {
      status: 422, code: "FABRIC_NOT_IN_PALETTE", detail: "Fabric not in palette",
      items: [{ index: 0, combinationIndex: null, fabricId: 32, fabricCode: "F-2", fabricGroupId: 42, reason: "COLOR_NOT_IN_PALETTE" }, "junk"],
    }), [])), { path: "/me/carts/12/items", body: {}, bearer: "T", actingCustomerId: 42 })
  } catch (e) { problem = e as V1ProblemError }
  assert("422 problem: code, detail, items parsed (junk dropped)",
    problem?.status === 422 && problem.code === "FABRIC_NOT_IN_PALETTE" && problem.items.length === 1 &&
    problem.items[0].fabricCode === "F-2" && problem.actingSent === true)
  assert("isActingNotAllowed only for 403 ACTING_NOT_ALLOWED sent with the header",
    isActingNotAllowed(new V1ProblemError({ status: 403, code: "ACTING_NOT_ALLOWED", actingSent: true })) &&
    !isActingNotAllowed(new V1ProblemError({ status: 403, code: "FORBIDDEN", actingSent: true })) &&
    !isActingNotAllowed(new V1ProblemError({ status: 403, code: "ACTING_NOT_ALLOWED", actingSent: false })))

  console.log("toActionError: v1 branch")
  const palette = toActionError(problem, "Failed to add item to cart")
  assert("FABRIC_NOT_IN_PALETTE -> code + items (paletteErrorMessage lists F-2)",
    palette.code === FABRIC_NOT_IN_PALETTE && palette.items?.[0].fabricCode === "F-2" && palette.message === "Fabric not in palette")
  const disabled = toActionError(new V1ProblemError({ status: 422, code: "FABRIC_GROUP_DISABLED", detail: "Group X is disabled" }), "F")
  assert("FABRIC_GROUP_DISABLED -> code, detail, no items", disabled.code === "FABRIC_GROUP_DISABLED" && disabled.message === "Group X is disabled" && disabled.items === undefined)
  const conflict = toActionError(new V1ProblemError({ status: 409, code: "CONFLICT", detail: "Cannot delete a cart whose items belong to an order" }), "Failed to delete cart")
  assert("409 CONFLICT -> the backend detail (= today's GraphQL message)", conflict.message === "Cannot delete a cart whose items belong to an order" && conflict.code === "CONFLICT")
  assert("no detail -> never 'v1 request failed: ...'",
    toActionError(new V1ProblemError({ status: 404, code: "NOT_FOUND" }), "F").message === "Not found" &&
    toActionError(new V1ProblemError({ status: 500, code: "INTERNAL" }), "Failed to remove item").message === "Failed to remove item" &&
    toActionError(new V1ProblemError({ status: 0 }), "Failed to fetch cart").message === "Failed to fetch cart" &&
    /try again later/i.test(toActionError(new V1ProblemError({ status: 429, code: "RATE_LIMITED" }), "F").message))
  assert("ACTING_NOT_ALLOWED surfaces its code", toActionError(new V1ProblemError({ status: 403, code: "ACTING_NOT_ALLOWED", detail: "cannot act" }), "F").code === "ACTING_NOT_ALLOWED")
  const gql = toActionError({ message: "x", graphQLErrors: [{ message: "Fabric not allowed", extensions: { code: "FABRIC_NOT_IN_PALETTE", items: [{ index: 0, reason: "R" }] } }] }, "F")
  assert("GraphQL branch unchanged", gql.code === "FABRIC_NOT_IN_PALETTE" && gql.message === "Fabric not allowed" && gql.items?.length === 1)

  console.log("carts-v1 request functions: every call scoped, none retried")
  process.env.NEXT_PUBLIC_BACKEND_REST_API = "http://b/api"
  const carts = require("../src/lib/data/carts-v1") as typeof import("../src/lib/data/carts-v1")
  const realFetch = globalThis.fetch
  const calls: Seen[] = []
  let answer: (s: Seen) => Response = () => json(200, cart)
  globalThis.fetch = stubFetch((s) => answer(s), calls)
  const who = { bearer: "T", actingCustomerId: 42 }
  try {
    const route = (method: string, url: string) => ({ method, url })
    const runs: Array<[string, () => Promise<unknown>, { method: string; url: string }]> = [
      ["list", () => carts.v1ListCarts(who), route("GET", "/me/carts")],
      ["active", () => carts.v1GetActiveCart(who), route("GET", "/me/carts/active")],
      ["detail", () => carts.v1GetCart(who, 12), route("GET", "/me/carts/12")],
      ["new", () => carts.v1StartNewCart(who), route("POST", "/me/carts")],
      ["rename", () => carts.v1RenameCart(who, 12, "N"), route("PATCH", "/me/carts/12")],
      ["activate", () => carts.v1ActivateCart(who, 12), route("POST", "/me/carts/12/activate")],
      ["delete", () => carts.v1DeleteCart(who, 12), route("DELETE", "/me/carts/12")],
      ["add", () => carts.v1AddCartItem(who, 12, input), route("POST", "/me/carts/12/items")],
      ["quantity", () => carts.v1UpdateCartItem(who, 12, 501, { quantity: 3 }), route("PATCH", "/me/carts/12/items/501")],
      ["reference", () => carts.v1UpdateCartItem(who, 12, 501, { reference: "" }), route("PATCH", "/me/carts/12/items/501")],
      ["remove", () => carts.v1RemoveCartItem(who, 12, 501), route("DELETE", "/me/carts/12/items/501")],
      ["offer", () => carts.v1GetCartOffer(who, 12, { language: "dk", showPvm: false, showVolume: true, vatRate: 0.21 }),
        route("GET", "/me/carts/12/offer?language=dk&showPvm=false&showVolume=true&vatRate=0.21")],
      ["offer email", () => carts.v1EmailCartOffer(who, 12, { pdfBase64: "JVBERi0xLjQK", recipientEmail: "a@b.test", fileName: "cart-offer-12.pdf" }),
        route("POST", "/me/carts/12/offer/email")],
    ]
    for (const [label, run, expected] of runs) {
      calls.length = 0
      const fixed = expected
      answer = (s) =>
        s.method === "DELETE" ? new Response(null, { status: 204 }) :
        s.url.includes("/offer/email") ? json(200, { sent: true }) :
        s.url.includes("/offer") ? json(200, { context: {}, items: [] }) :
        s.url.endsWith("/me/carts") && s.method === "GET" ? json(200, { data: [] }) :
        s.url.includes("/items") ? json(201, item) : json(200, cart)
      await run()
      assert(`${label}: ${fixed.method} ${fixed.url}, bearer + X-Acting-Customer-Id: 42, one call`,
        calls.length === 1 && calls[0].method === fixed.method && calls[0].url === `http://b/api/v1${fixed.url}` &&
        calls[0].headers.Authorization === "Bearer T" && calls[0].headers["X-Acting-Customer-Id"] === "42")
    }
    calls.length = 0
    await carts.v1AddCartItem(who, 12, input)
    assert("add body = toV1AddCartItemBody(input)", calls[0].body === JSON.stringify(toV1AddCartItemBody(input)))
    calls.length = 0
    await carts.v1EmailCartOffer(who, 12, { pdfBase64: "JVBERi0xLjQK" })
    assert("offer email body: no undefined keys", calls[0].body === JSON.stringify({ pdfBase64: "JVBERi0xLjQK" }))

    for (const [status, code] of [[403, "ACTING_NOT_ALLOWED"], [404, "NOT_FOUND"], [403, "FORBIDDEN"]] as const) {
      calls.length = 0
      answer = () => json(status, { status, code })
      let err: V1ProblemError | null = null
      try { await carts.v1AddCartItem(who, 12, input) } catch (e) { err = e as V1ProblemError }
      assert(`write ${status} ${code}: thrown, NOT retried without the header`, err?.status === status && calls.length === 1)
      calls.length = 0
      err = null
      try { await carts.v1GetActiveCart(who) } catch (e) { err = e as V1ProblemError }
      assert(`read ${status} ${code}: thrown, NOT retried without the header`, err?.status === status && calls.length === 1)
    }
    let bad: unknown = null
    try { await carts.v1GetCart(who, 0) } catch (e) { bad = e }
    assert("invalid cart id: no request", bad instanceof Error && calls.length === 1)

    console.log("resolveV1CartCaller (v1 transport only)")
    let ownerLookups = 0
    const lookups = (header: number | null, owner: number | null) => ({
      actingHeader: async () => header,
      owner: async () => { ownerLookups++; return owner },
    })
    ownerLookups = 0
    const own = await carts.resolveV1CartCaller("T", lookups(null, 5))
    assert("no acting customer selected (customer, or agent without a selection) -> NOT refused, no header, no owner lookup",
      own.actingCustomerId === null && own.bearer === "T" && ownerLookups === 0)
    const agrees = await carts.resolveV1CartCaller("T", lookups(42, 42))
    assert("acting header that matches the owner -> sent", agrees.actingCustomerId === 42)
    let mismatch: unknown = null
    try { await carts.resolveV1CartCaller("T", lookups(42, 43)) } catch (e) { mismatch = e }
    assert("owner and header disagree -> CartScopeMismatchError, nothing sent",
      mismatch instanceof carts.CartScopeMismatchError)
    const unresolved = await carts.resolveV1CartCaller("T", lookups(42, null))
    assert("owner unresolved (stale / refused acting) -> header still sent, the backend answers it",
      unresolved.actingCustomerId === 42)
    ownerLookups = 0
    const known = await carts.resolveV1CartCaller("T", lookups(42, 99), 42)
    assert("knownOwner (owner-gated actions) is used instead of a second lookup", known.actingCustomerId === 42 && ownerLookups === 0)
    mismatch = null
    try { await carts.resolveV1CartCaller("T", lookups(42, 42), 7) } catch (e) { mismatch = e }
    assert("knownOwner that disagrees -> refused", mismatch instanceof carts.CartScopeMismatchError)
    assert("mismatch message is user-readable (toActionError)",
      /selected customer has changed/.test(toActionError(new carts.CartScopeMismatchError(), "F").message))
  } finally {
    globalThis.fetch = realFetch
  }

  console.log(failures === 0 ? "\nAll cases passed" : `\n${failures} case(s) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.log("verify-carts-v1 crashed:", error)
  process.exit(1)
})
