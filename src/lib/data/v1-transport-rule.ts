/**
 * Which backend API serves a request: REST v1 or the legacy GraphQL path.
 * ONE rule for every migrated surface (portal REST migration slices 1, 2,
 * 4, 5, 6, 7): catalogue listings, the product page (+ linked products), the
 * configurator data, taxonomy (menu, category, collection, category tiles),
 * CMS pages (by path / code / slug, page grids), content-block config, the
 * shop settings, the public forms, the BFF proxies under /api (invoice,
 * customer files, Tawk hash), orders, palettes, the agent's customer
 * selector, the acting customer, the current user and the "show all
 * products" gate.
 *
 * Caller-independent reads (category menu, categories by id, the default
 * price list, and the settings values that do not depend on the session:
 * new_badge_days, pricelist switches, low-stock threshold) always use v1
 * WITHOUT a bearer: there is nothing session-specific to keep on GraphQL.
 *
 * ONE extra condition, configurator data only (selectConfiguratorTransport):
 * a v1 session whose login has prices DISABLED (GET /auth/session
 * `features.prices === false`) keeps the GraphQL configurator call, because
 * v1 serves it null amounts and the configurator / add-to-cart still price
 * on the client. DELETE WHEN CARTS ARE PRICED ON THE SERVER.
 *
 * Rule (owner decision; no environment switch, no feature flag):
 *   - a usable v1 access token                         -> v1
 *   - a true guest: no v1 session AND no `_furni_jwt`  -> v1 for the
 *       catalogue (the guest catalogue); "guest" for identity surfaces (no
 *       backend call at all: no customer, no orders, no palettes)
 *   - anything else                                    -> graphql
 *       a `_furni_jwt` without a usable v1 token: legacy-only logins (old
 *       magic links) and a v1 session that still `needs-refresh` after the
 *       refresh-on-demand attempt (src/lib/v1-session/on-demand.ts: renders
 *       cannot refresh; route handlers and server actions can). Also
 *       `needs-refresh` WITHOUT `_furni_jwt`: not a true guest (the refresh
 *       token belongs to a login), and GraphQL without a token is the guest
 *       catalogue / logged-out state anyway, exactly as before.
 *   Orphan v1 cookies (v1 cookies but no `_furni_jwt`: the GraphQL side
 *   ended the login) count as NO v1 session before this rule runs
 *   (effectiveV1Status), as in the middleware's orphan rule.
 *
 * A v1 401 on a call made under "v1" re-routes that one call to the GraphQL
 * path (the "usable token" premise was false). Every other v1 failure fails
 * closed on the v1 path (no data), never by switching identity.
 *
 * TEMPORARY. Delete the GraphQL path once every session has a usable v1
 * access token (impersonation on v1 = 2c-4 is live, then the 2c-5 soak and
 * the D2 forced re-login). The decision lives only here; to remove it:
 *   1. make selectV1Transport return "v1" and selectIdentityTransport return
 *      "v1" / "guest" (or delete both and the `transport` / `identity`
 *      fields of ./v1-transport.ts);
 *   2. drop every 401 arm that calls the GraphQL path:
 *      ./catalog-v1.ts runCatalogListing (the `graphql` parameter),
 *      ./me-v1.ts runIdentityCall (the `graphql` parameter),
 *      src/lib/util/session-validation.ts validateSession (the getMe branch),
 *      src/app/api/{orders/[id]/invoice,customer-files/[id],tawk-hash}/route.ts
 *      (the legacy-REST branch and its `_furni_jwt` read);
 *   3. delete the GraphQL helpers:
 *      ./{category-products,collection-products,search-products,
 *      category-filters,products}.ts `*Graphql` + the transport check in
 *      products.ts enrichContentBlocksWithProducts;
 *      ./orders.ts `*Graphql`, ./fabric-palettes.ts getFabricPalettesGraphql,
 *      ./customer-search.ts searchCustomersGraphql,
 *      ./acting-customer.ts actingCustomerGraphql,
 *      ./show-all-products.ts canShowAllProductsGraphql + the token decode in
 *      isImpersonatedByManager (acting-customer.ts);
 *      and the SDK methods they call (sdk.customer.getMe / getCustomerOrders /
 *      getCustomerOrderById / getFabricPalettes* / searchCustomers);
 *   4. NOT getClaimsLink (src/lib/data/customer.ts): it has no v1 endpoint
 *      yet (backend gap: GET /me/claims-link) and stays on GraphQL until the
 *      backend adds one.
 *   5. slices 2, 4, 5 (product page, configurator, taxonomy, CMS, settings,
 *      forms): drop the GraphQL arms of
 *      ./furnisystems-products.ts getProductByPermalinkGraphql (and the
 *      getCustomerFilterData call in it),
 *      ./configurator.ts getConfiguratorDataGraphql,
 *      ./cms-v1.ts runCmsCall (the `graphql` parameter),
 *      ./{categories,collection,pages,shop-settings,email-signup,partner}.ts
 *      `*Graphql`, and the SDK modules they call (sdk.categories,
 *      sdk.collections, sdk.pages, sdk.shopSettings, products
 *      getProductByPermalink / getConfiguratorData,
 *      src/configurator/queries/configurator-queries.ts).
 *      ./anonymous-product-tags.ts and ./default-pricelist.ts are then only
 *      read by GraphQL arms (getCustomerFilterData): delete them with step 3.
 *   6. selectConfiguratorTransport's prices-disabled arm: delete when carts
 *      are priced on the server (then a login without prices needs no
 *      client-side amounts and takes v1 like everyone else).
 *
 * Pure, no imports: unit-tested by scripts/verify-catalog-v1.ts and
 * scripts/verify-identity-v1.ts.
 */
export type V1Transport = "v1" | "graphql"
/** Identity surfaces: a true guest makes no backend call at all. */
export type IdentityTransport = "v1" | "graphql" | "guest"

export type V1SessionStatus = "ok" | "needs-refresh" | "anonymous"

/**
 * The status the rule sees: v1 cookies without the companion `_furni_jwt`
 * (an orphan) count as no v1 session — never refreshed, never sent.
 */
export function effectiveV1Status(
  status: V1SessionStatus,
  hasLegacyJwt: boolean
): V1SessionStatus {
  return hasLegacyJwt ? status : "anonymous"
}

/** Catalogue listings (guests are served by v1 too). */
export function selectV1Transport(
  v1Status: V1SessionStatus,
  hasLegacyJwt: boolean
): V1Transport {
  if (v1Status === "ok") return "v1"
  if (v1Status === "anonymous" && !hasLegacyJwt) return "v1"
  return "graphql"
}

/** Who-am-I / orders / palettes / files / selector: no call for a guest. */
export function selectIdentityTransport(
  v1Status: V1SessionStatus,
  hasLegacyJwt: boolean
): IdentityTransport {
  if (v1Status === "ok") return "v1"
  if (v1Status === "anonymous" && !hasLegacyJwt) return "guest"
  return "graphql"
}

/**
 * Configurator data: the request's transport, except that a login with
 * prices disabled (`features.prices === false` on GET /auth/session) keeps
 * the GraphQL call (null v1 amounts cannot be priced on the client).
 * `pricesFeature` undefined / null = unknown or a guest: not disabled.
 * TEMPORARY: delete when carts are priced on the server.
 */
export function selectConfiguratorTransport(
  transport: V1Transport,
  pricesFeature: boolean | null | undefined
): V1Transport {
  if (transport === "graphql") return "graphql"
  return pricesFeature === false ? "graphql" : "v1"
}
