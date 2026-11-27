/**
 * Which backend API serves the catalogue listings for this request.
 *
 * TEMPORARY (portal REST migration slice 1). Delete once every session has
 * a usable v1 access token (impersonation on v1 = stage 2c-4, the 2c-5 soak,
 * the D2 forced re-login). The decision lives only here; to remove the
 * GraphQL path:
 *   1. make this return "v1" (or delete it and ./catalog-transport.ts's
 *      `transport` field);
 *   2. in ./catalog-v1.ts `runCatalogListing`: drop the `graphql` parameter
 *      and its 401 arm (a v1 401 re-routes that one call to GraphQL: the
 *      second, error-driven, use of the GraphQL path);
 *   3. delete the `*Graphql` helpers in ./{category-products,
 *      collection-products,search-products,category-filters,products}.ts and
 *      the transport check in products.ts enrichContentBlocksWithProducts.
 *
 * Rule (owner decision; no environment switch, no feature flag):
 *   - a usable v1 access token                       -> v1
 *   - a true guest: no v1 session AND no `_furni_jwt`  -> v1
 *   - anything else                                   -> graphql
 *       a `_furni_jwt` without a usable v1 token: legacy GraphQL
 *       impersonation logins, legacy-only logins (old magic links), and
 *       a v1 session that `needs-refresh` (only middleware / actions can
 *       refresh; route handlers under /api never pass the middleware).
 *       Also `needs-refresh` WITHOUT `_furni_jwt`: not a true guest (the
 *       refresh token belongs to a login), and GraphQL without a token is
 *       the guest catalogue anyway, exactly as before the migration.
 *
 * Pure, no imports: unit-tested by scripts/verify-catalog-v1.ts.
 */
export type CatalogTransport = "v1" | "graphql"

export type V1SessionStatus = "ok" | "needs-refresh" | "anonymous"

export function selectCatalogTransport(
  v1Status: V1SessionStatus,
  hasLegacyJwt: boolean
): CatalogTransport {
  if (v1Status === "ok") return "v1"
  if (v1Status === "anonymous" && !hasLegacyJwt) return "v1"
  return "graphql"
}
