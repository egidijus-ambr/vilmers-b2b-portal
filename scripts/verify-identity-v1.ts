// Unit checks for portal REST slices 6/7 (identity, orders, palettes,
// managed customers, BFF proxies): the shared v1-vs-GraphQL rule, the v1 DTO
// -> portal-type adapters, request validation, and the v1 data client's POST
// and binary GET. No backend, no network: fetch is a stub.
// Run with: pnpm verify:identity-v1
//   (= node --conditions=react-server -r sucrase/register scripts/verify-identity-v1.ts)
// Exits 0 when every case passes, 1 otherwise.
import {
  effectiveV1Status,
  selectIdentityTransport,
  selectV1Transport,
} from "../src/lib/data/v1-transport-rule"
import {
  SHOW_ALL_PRODUCTS_PERMISSION,
  isV1ImpersonationSession,
  isV1OrderId,
  mapV1ManagedCustomer,
  mapV1MeToActingCustomer,
  mapV1MeToCustomer,
  mapV1OrderDetail,
  mapV1OrderListItem,
  mapV1OrderPage,
  mapV1Palettes,
  parseV1FileId,
  sessionHasPermission,
  v1PageFromOffset,
  type V1AuthSession,
  type V1Me,
  type V1OrderDetail,
  type V1OrderListItem,
} from "../src/lib/furnisystems-sdk/modules/customer/v1-adapter"
import {
  V1ProblemError,
  dropActingIfConfirmedStale,
  v1DataGetBinary,
  v1DataPost,
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

const me: V1Me = {
  id: 42,
  name: "Jonas",
  surname: "Jonaitis",
  email: "j@example.test",
  phone: null,
  role: "agent",
  companyName: "ACME UAB",
  accountCode: "C-42",
  priceListId: 7,
  customerGroupId: 3,
  discount: 5,
  deliveryTerms: "EXW",
  tags: [{ id: 11, profiles: [{ id: 1, name: "Nordic", language: "en" }] }],
  fabricPalettes: [{ id: 9, name: "P9", code: "p9" }],
  files: [
    { id: 5, name: "Terms", originalName: "terms.pdf", mimeType: "application/pdf", sizeBytes: 123, displayOrder: 2, createdAt: "2026-01-01T00:00:00.000Z", downloadUrl: "/api/v1/me/files/5/download" },
  ],
  customerGroup: { id: 3, name: "Retail", priceListId: 8, fabricPalettes: [{ id: 4, name: "G4", code: null }] },
  features: { configurator: true, claims: false, prices: true },
  account: { id: "acc-1", name: "Jonas login", email: "login@example.test", isPricesEnabled: false, status: "ACTIVE", subAccount: { id: 2, name: "Vilnius shop" } },
  companyAddress: { country: "LT" },
  managers: [
    { id: 70, manager: { id: 71, name: "Ona", surname: "Onaite", email: "ona@example.test", phone: "+370", role: "agent", spokenLanguages: ["lt", "en"], image: { id: 1, src: "o.png", srcMd: "o-md.png" } } },
  ],
  additionalComponents: [{ id: 300, code: "LEG", group: { id: 30, code: "legs" } }],
  acting: null,
}

async function main() {
  console.log("Shared rule")
  assert("orphan (v1 cookies, no jwt) -> anonymous", effectiveV1Status("ok", false) === "anonymous" && effectiveV1Status("needs-refresh", false) === "anonymous")
  assert("with jwt the status is kept", effectiveV1Status("ok", true) === "ok" && effectiveV1Status("needs-refresh", true) === "needs-refresh")
  assert("identity: ok -> v1", selectIdentityTransport("ok", true) === "v1")
  assert("identity: true guest -> guest (no call)", selectIdentityTransport("anonymous", false) === "guest")
  assert("identity: legacy-only -> graphql", selectIdentityTransport("anonymous", true) === "graphql")
  assert("identity: needs-refresh after the on-demand attempt -> graphql", selectIdentityTransport("needs-refresh", true) === "graphql")
  assert("catalogue rule unchanged: guest -> v1", selectV1Transport("anonymous", false) === "v1")
  assert("orphan through both: catalogue v1 guest, identity guest",
    selectV1Transport(effectiveV1Status("ok", false), false) === "v1" &&
      selectIdentityTransport(effectiveV1Status("ok", false), false) === "guest")

  console.log("Adapter: GET /me -> Customer")
  const c = mapV1MeToCustomer(me)
  assert("identity fields", c.id === 42 && c.email === "j@example.test" && c.full_name === "Jonas" && c.name === "Jonas" && c.role === "agent")
  assert("company / code / discount / terms", c.b2b_company_name === "ACME UAB" && c.account_code === "C-42" && c.b2b_customer_discount === 5 && c.delivery_terms === "EXW")
  assert("price lists (own + group)", (c.price_listId as unknown) === 7 && (c.group_price_listId as unknown) === 8 && (c.customer_group?.price_listId as unknown) === 8)
  assert("tags -> tag_profiles", eq(c.tags, [{ id: 11, tag_profiles: [{ name: "Nordic", language: "en" }] }]))
  assert("palette ids (own + group)", eq(c.fabric_palettes, [{ id: 9 }]) && eq(c.customer_group?.fabric_palettes, [{ id: 4 }]))
  assert("files snake_case", eq(c.files, [{ id: 5, name: "Terms", original_name: "terms.pdf", mime_type: "application/pdf", size_bytes: 123, display_order: 2 }]))
  assert("features -> is_*_enabled", c.is_configurator_enabled === true && c.is_claims_enabled === false)
  assert("account -> customer_account (prices flag kept)", eq(c.customer_account, { id: "acc-1", name: "Jonas login", email: "login@example.test", shop: "Vilnius shop", is_prices_enabled: false }))
  assert("no account -> fail-open placeholder", mapV1MeToCustomer({ ...me, account: null }).customer_account?.is_prices_enabled === true)
  assert("managers mapped", eq(c.managers, [{ id: 70, manager: { name: "Ona", surname: "Onaite", email: "ona@example.test", role: "agent", default_phone_number: "+370", spoken_languages: ["lt", "en"], image: { src: "o.png", src_md: "o-md.png" } } }]))
  assert("company country", c.b2b_company_address?.country === "LT")
  assert("additional components nested like GraphQL", eq(c.additional_components, [{ additionalComponent: { id: 300, code: "LEG", additional_component_group: { id: 30, code: "legs" } } }]))
  assert("nulls tolerated", (() => { try { mapV1MeToCustomer({ ...me, tags: null, files: null, managers: null, customerGroup: null, additionalComponents: null, fabricPalettes: null, companyAddress: null, features: null }); return true } catch { return false } })())

  console.log("Adapter: acting / managed customers")
  const a = mapV1MeToActingCustomer(me)
  assert("acting: the fields getCustomerFilterData / pricelist export read",
    a.id === 42 && a.price_listId === 7 && (a.group_price_listId as unknown) === 8 && eq(a.tags?.map((t) => t.id), [11]) &&
      a.delivery_terms === "EXW" && a.additional_components?.length === 1 && a.files?.length === 1 && a.role === "agent")
  const m = mapV1ManagedCustomer({ id: 5, name: "N", surname: null, email: "e", accountCode: "C5", companyName: "Co", customerGroupName: "G", role: "customer" })
  assert("managed row -> selector fields", m.id === 5 && m.account_code === "C5" && m.b2b_company_name === "Co" && m.customer_group?.name === "G" && m.price_listId === null)

  console.log("Adapter: orders")
  const li: V1OrderListItem = {
    id: "ckabc123", createdAt: "2026-10-01T10:00:00.000Z", status: "MANUFACTURING", type: "ORDER", code: "O-1", externalCode: "AX-1", number: 17,
    confirmedDeliveryDate: null, preferredDeliveryDate: null, totalPrice: 100.5, totalPriceConfirmed: 99, invoiceCode: "INV1", hasInvoice: true,
    invoiceUrl: "/api/v1/me/orders/ckabc123/invoice.pdf", purchasedBy: { id: 1, name: "Buyer", accountCode: "B1" }, login: null,
    subAccount: { id: 2, name: "Shop" }, items: [{ id: 1, reference: "ref-a" }, { id: 2, reference: null }],
  }
  const o = mapV1OrderListItem(li)
  assert("list item core", o.id === "ckabc123" && o.display_id === "AX-1" && o.order_status === "MANUFACTURING" && o.order_code === "O-1" && o.total_price === 100.5 && o.total_price_confirmed === 99)
  assert("invoice: truthy portal proxy path, never the backend path", o.invoice_pdf_url === "/api/orders/ckabc123/invoice" && !String(o.invoice_pdf_url).includes("/v1/"))
  assert("no invoice -> undefined", mapV1OrderListItem({ ...li, hasInvoice: false, invoiceUrl: null }).invoice_pdf_url === undefined)
  assert("display_id falls back to code", mapV1OrderListItem({ ...li, externalCode: null }).display_id === "O-1")
  assert("references", eq(o.order_item_references, ["ref-a"]) && o.items?.length === 2)
  assert("purchaser / sub-account", eq(o.purchased_by, { name: "Buyer", account_code: "B1" }) && eq(o.purchased_subAccount, { name: "Shop" }))
  const page = mapV1OrderPage({ data: [li], meta: { page: 2, pageSize: 10, totalCount: 25, totalPages: 3 } }, 10)
  assert("page meta -> GraphQL pagination", page.totalCount === 25 && page.currentPage === 2 && page.totalPages === 3 && page.hasNextPage && page.hasPreviousPage && page.orders.length === 1)
  const last = mapV1OrderPage({ data: [], meta: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 } }, 10)
  assert("empty page", !last.hasNextPage && !last.hasPreviousPage && last.orders.length === 0)

  const det: V1OrderDetail = {
    ...li,
    preferredDeliveryDate: "2026-11-01T00:00:00.000Z",
    shippingAddress: { id: 1, phone: "+1", country: "LT", city: "Vilnius", postalCode: "01", stateRegion: null, address1: "Gatve 1", address2: null },
    billingAddress: null,
    paymentMethod: { id: 3, profiles: [{ id: 1, language: "en", title: "Invoice" }] },
    items: [
      {
        id: 900, reference: "r1", price: 50, shippingPrice: 5, quantity: 2, sku: "SKU", volume: 1.2,
        configurations: [[{ moduleCode: "M1", moduleName: "Arm", price: 10, shapeType: "ARM" }]],
        shippingMethod: { id: 4, profiles: [{ id: 1, language: "en", title: "Truck" }] },
        cartItem: {
          id: 1, advancedProductType: "SOFA", selectedSofaCombinations: "[]", fabricCode: "F1", fabricColorName: "Red", fabricGroupName: "G",
          fabricCombination: { id: 8, image: { id: 1, src: "c.png", srcXs: "c-xs.png" } },
          fabrics: [{ id: 3, fabricCode: "F1", fabricColorName: "Red", fabricGroupName: "G",
            fabric: { id: 31, code: "F1", colorName: "Red", image: { id: 2, src: "f.png", srcThumbnail: "f-t.png" } },
            fabricGroup: { id: 32, code: "G", type: "MAIN", profiles: [{ id: 1, language: "en", name: "Group" }] },
            combinationOption: { id: 33, profiles: [{ id: 1, language: "en", name: "Seat" }] } }],
          components: [{ id: 400, code: "LEG", groupId: 40, color: { id: 1, hex: "#000", background: null },
            dimensions: { width: 1, height: 2, length: null }, group: { id: 40, code: "legs", profiles: [{ id: 1, language: "en", name: "Legs" }] },
            image: { id: 3, src: "l.png", srcThumbnail: "l-t.png" }, isWrapper: false,
            linked: [{ displayOrder: 1, id: 1, linkType: "WRAPS", target: { id: 401, code: "X", image: null, profiles: [{ id: 1, language: "en", name: "T", materialName: "Oak" }] } }],
            profiles: [{ id: 1, language: "en", name: "Leg", materialName: "Metal" }] }],
          product: { id: 1, singleProduct: null, advancedProduct: { id: 2, images: [{ id: 1, src: "p.png", srcXs: "p-xs.png" }], profiles: [{ id: 1, language: "en", name: "Alpine" }],
            dimensions: { width: 200, tableExtendedLength: 300, seatHeight: 45 } } },
        },
      },
    ],
  }
  const d = mapV1OrderDetail(det)
  assert("detail addresses", eq(d.shipping_address, { id: 1, phone_number: "+1", country: "LT", city: "Vilnius", postal_code: "01", address_1: "Gatve 1" }) && d.billing_address === undefined)
  assert("detail payment titles", eq(d.payment_method, { id: 3, payment_method_profiles: [{ title: "Invoice", language: "en" }] }))
  const it = d.order_items_detail![0]
  assert("item money / qty / volume", it.id === "900" && it.price === 50 && it.shipping_price === 5 && it.quantity === 2 && it.volume === 1.2 && it.sku === "SKU")
  assert("configurations -> metadata.configurations", eq(it.metadata, { configurations: [[{ moduleCode: "M1", moduleName: "Arm", price: 10, shapeType: "ARM" }]] }))
  assert("shipping method titles", eq(it.shipping_method, { id: 4, shipping_method_profiles: [{ title: "Truck", language: "en" }] }))
  const ci = it.cart_item!
  assert("advanced product profiles / images", ci.product_container?.advanced_product?.advanced_product_profiles?.[0].name === "Alpine" && ci.product_container?.advanced_product?.images?.[0].src_xs === "p-xs.png")
  assert("dimensions incl. the misspelt table_extended_lengh", eq(ci.product_container?.advanced_product?.dimensions, { width: 200, seat_height: 45, table_extended_lengh: 300 }))
  assert("cart item snapshot fields", ci.advanced_product_type === "SOFA" && ci.fabric_code === "F1" && ci.fabric_color_name === "Red" && ci.selected_sofa_combinations === "[]")
  assert("fabrics", eq(ci.cartItemFabrics?.[0], { id: "3", fabric_code: "F1", fabric_color_name: "Red", fabric_group_name: "G",
    fabric: { id: "31", code: "F1", color_name: "Red", image: { src: "f.png", src_thumbnail: "f-t.png" } },
    fabric_group: { id: "32", code: "G", type: "MAIN", fabric_group_profiles: [{ name: "Group", language: "en" }] },
    combination_option: { fabricCombinationOptionProfiles: [{ name: "Seat", language: "en" }] } }))
  const comp = ci.additional_components![0]
  assert("component groupId -> additionalComponentGroupId", comp.additionalComponentGroupId === 40 && comp.code === "LEG")
  assert("component profiles / group / linked", comp.additional_component_profiles?.[0].material_name === "Metal" &&
    comp.additional_component_group?.additional_component_group_profiles?.[0].name === "Legs" &&
    comp.linked_components_source?.[0].target_component.additional_component_profiles[0].material_name === "Oak" &&
    comp.linked_components_source?.[0].target_component.image === null)
  assert("fabric combination image", ci.fabricCombination?.image?.src_xs === "c-xs.png")

  console.log("Adapter: palettes")
  const pal = mapV1Palettes({ data: [
    { id: 2, name: "B", code: null, fabricGroups: [] },
    { id: 1, name: "A", code: "a", fabricGroups: [{ id: 10, name: "Override", colorCodes: ["01"], colorOverrides: [{ code: "01", name: "Sky", category: "CAT 3" }],
      fabricGroup: { id: 20, code: "FG", createdAt: "2025-01-01T00:00:00.000Z", type: "MAIN",
        fabrics: [{ id: 30, code: "01", colorName: "Blue", createdAt: null, order: 1, image: { id: 5, src: "s.png", srcMd: "m.png", srcThumbnail: "t.png" } }],
        profiles: [{ id: 1, language: "en", name: "Velvet", description: "Soft" }],
        features: [{ id: 6, code: "WASH", photo: { id: 7, src: "w.png" }, profiles: [{ id: 1, language: "en", name: "Washable" }], group: { id: 8, code: "CARE", profiles: [{ id: 1, language: "en", name: "Care" }] } }],
        priceCategories: [{ id: 9, groupNumber: 3 }], manufacturer: { id: 11, priceCategories: [{ groupNumber: 3 }, { groupNumber: 4 }] } } }] },
  ] })
  assert("server order kept (no re-sort)", eq(pal.map((p) => p.id), [2, 1]))
  const g = pal[1].fabric_groups[0]
  assert("override name + raw color overrides (category kept)", g.name === "Override" && eq(g.color_overrides, [{ code: "01", name: "Sky", category: "CAT 3" }]) && eq(g.color_codes, ["01"]))
  assert("fabrics", eq(g.fabric_group.fabrics, [{ id: 30, code: "01", createdAt: null, color_name: "Blue", order: 1, image: { id: 5, src: "s.png", src_thumbnail: "t.png", src_md: "m.png" } }]))
  assert("profiles / features", g.fabric_group.fabric_group_profiles[0].description === "Soft" &&
    g.fabric_group.fabric_features?.[0].fabric_feature.fabric_feature_group?.fabric_feature_group_profiles[0].name === "Care")
  assert("price categories + manufacturer (G3)", eq(g.fabric_group.fabric_price_category, [{ id: 9, group_number: 3 }]) &&
    eq(g.fabric_group.manufacturer, { id: 11, fabric_price_category: [{ group_number: 3 }, { group_number: 4 }] }))

  console.log("Adapter: auth session")
  const session: V1AuthSession = { principal: { realm: "portal", id: 1, role: "admin" }, permissions: ["me.read", SHOW_ALL_PRODUCTS_PERMISSION], session: { sid: "s", kind: "interactive", expiresAt: "x" } }
  assert("permission present", sessionHasPermission(session, "catalog.show_all_products"))
  assert("permission absent / no session -> false", !sessionHasPermission({ ...session, permissions: ["me.read"] }, SHOW_ALL_PRODUCTS_PERMISSION) && !sessionHasPermission(null, SHOW_ALL_PRODUCTS_PERMISSION))
  assert("impersonation detection", isV1ImpersonationSession({ ...session, principal: { ...session.principal, impersonatedBy: 5 } }) &&
    isV1ImpersonationSession({ ...session, session: { ...session.session, kind: "impersonation" } }) && !isV1ImpersonationSession(session))

  console.log("Validation")
  assert("order ids", isV1OrderId("ckabc_12-3") && !isV1OrderId("../x") && !isV1OrderId("") && !isV1OrderId("a".repeat(65)) && !isV1OrderId("a b"))
  assert("file ids", parseV1FileId("1") === 1 && parseV1FileId("2147483647") === 2147483647 && parseV1FileId("2147483648") === null &&
    parseV1FileId("0") === null && parseV1FileId("01") === null && parseV1FileId("1e3") === null && parseV1FileId("-1") === null)
  assert("offset -> page", eq(v1PageFromOffset(10, 0), { page: 1, pageSize: 10 }) && eq(v1PageFromOffset(10, 20), { page: 3, pageSize: 10 }) &&
    eq(v1PageFromOffset(500, 0), { page: 1, pageSize: 50 }) && eq(v1PageFromOffset(0, -5), { page: 1, pageSize: 1 }))

  console.log("Client: POST / binary")
  const seen: Array<{ url: string; init: RequestInit }> = []
  const okFetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, init })
    if (String(url).includes("tawk")) return new Response(JSON.stringify({ hash: "abc" }), { status: 200, headers: { "content-type": "application/json" } })
    return new Response("PDFDATA", { status: 200, headers: { "content-type": "application/pdf", "content-length": "7" } })
  }) as unknown as typeof fetch
  const deps = { restApiUrl: "http://backend.test/api/", fetch: okFetch, bffHeaders: async () => ({ "x-bff-secret": "s", "x-client-ip": "203.0.113.1" }) }
  const hash = await v1DataPost<{ hash: string }>(deps, { path: "/integrations/tawk/hash", bearer: "TOKEN" })
  const post = seen[0]
  const ph = post.init.headers as Record<string, string>
  assert("POST url / method / no body / no content-type", post.url === "http://backend.test/api/v1/integrations/tawk/hash" && post.init.method === "POST" && post.init.body === undefined && !("Content-Type" in ph))
  assert("POST headers: bearer, portal, BFF, no acting, no-store", ph.Authorization === "Bearer TOKEN" && ph["x-client"] === "portal" && ph["x-bff-secret"] === "s" && !("X-Acting-Customer-Id" in ph) && post.init.cache === "no-store")
  assert("POST json", hash.hash === "abc")
  const bin = await v1DataGetBinary(deps, { path: "/me/orders/ck1/invoice.pdf", bearer: "TOKEN", actingCustomerId: 77 }, "application/pdf")
  const bh = seen[1].init.headers as Record<string, string>
  assert("binary: acting header + accept with problem+json", bh["X-Acting-Customer-Id"] === "77" && bh.Accept === "application/pdf, application/problem+json")
  assert("binary: body unread (streamable)", !bin.bodyUsed && (await bin.text()) === "PDFDATA")
  const failFetch = (async () => new Response(JSON.stringify({ code: "NOT_FOUND", requestId: "r9" }), { status: 404, headers: { "content-type": "application/problem+json" } })) as unknown as typeof fetch
  let err: unknown = null
  try { await v1DataGetBinary({ ...deps, fetch: failFetch }, { path: "/me/files/1/download", bearer: "T", actingCustomerId: 5 }) } catch (e) { err = e }
  assert("binary 404 -> V1ProblemError with code / actingSent", err instanceof V1ProblemError && err.status === 404 && err.code === "NOT_FOUND" && err.actingSent && err.requestId === "r9")
  const netFetch = (async () => { throw new TypeError("fetch failed") }) as unknown as typeof fetch
  err = null
  try { await v1DataPost({ ...deps, fetch: netFetch }, { path: "/integrations/tawk/hash", bearer: "T" }) } catch (e) { err = e }
  assert("network -> status 0", err instanceof V1ProblemError && err.status === 0)

  console.log("Acting retry for /me surfaces")
  let calls: Array<number | null> = []
  let dropped = 0
  const r1 = await withActingRetry(7, async (id) => { calls.push(id); if (id) throw new V1ProblemError({ status: 404, actingSent: true }); return "own" }, () => { dropped++ })
  assert("404 with acting -> own scope + stale cookie dropped", r1 === "own" && eq(calls, [7, null]) && dropped === 1)
  calls = []
  err = null
  try { await withActingRetry(7, async (id) => { calls.push(id); throw new V1ProblemError({ status: 404, actingSent: id !== null }) }, () => { dropped++ }) } catch (e) { err = e }
  assert("404 for the resource itself (retry 404 too) -> thrown, cookie kept", err instanceof V1ProblemError && eq(calls, [7, null]) && dropped === 1)

  console.log("Acting-narrowed resources (order / invoice / file)")
  let dropN = 0
  const drop = () => { dropN++ }
  const resource404 = async (id: number | null) => { if (id) throw new V1ProblemError({ status: 404, actingSent: true }); return "ok" }
  const keepIt = await withActingRetry(7, resource404, dropActingIfConfirmedStale(async () => ({ id: 7 }), drop))
  assert("404 with header, 200 without, /me+header 200 -> cookie KEPT", keepIt === "ok" && dropN === 0)
  const dropIt = await withActingRetry(7, resource404, dropActingIfConfirmedStale(async () => { throw new V1ProblemError({ status: 404, actingSent: true }) }, drop))
  assert("/me+header 404 -> cookie dropped", dropIt === "ok" && dropN === 1)
  await withActingRetry(7, resource404, dropActingIfConfirmedStale(async () => { throw new V1ProblemError({ status: 503, actingSent: true }) }, drop))
  assert("/me+header 503 -> cookie kept", dropN === 1)

  console.log(failures === 0 ? "\nAll cases passed" : `\n${failures} case(s) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.log("verify-identity-v1 crashed:", error)
  process.exit(1)
})
