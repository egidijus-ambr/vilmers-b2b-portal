import "server-only"

/**
 * REST v1 taxonomy, CMS pages, content-block config, shop settings and the
 * default price list (portal REST migration slices 4 and 5), behind the
 * existing data functions in ./{categories,collection,pages,shop-settings,
 * new-badge-days,pricelist-settings,fabric-callout-settings,
 * default-pricelist,email-signup}.ts.
 *
 * Two kinds of read:
 *   shared   (v1SharedGet) no bearer, no acting header, no BFF headers:
 *            the answer is the same for every caller (S routes: menu,
 *            categories by id, default price list) or is the GUEST answer
 *            of a D route (public pages / settings: private pages are not
 *            in it). Only these may sit inside unstable_cache (the callers
 *            do that, and throw on failure so a failure is never cached).
 *   session  (runCmsCall) the request's transport (./v1-transport-rule.ts):
 *            v1 with the session's bearer (a portal session sees private
 *            pages and private link targets), GraphQL for legacy-only
 *            sessions and after a v1 401. Never cached across requests.
 *            No acting header: the CMS routes do not depend on it.
 */
import {
  isV1ProblemError,
  v1DataGet,
  v1DataPost,
  type V1Query,
} from "@lib/furnisystems-sdk/client/v1-data"
import { describeV1Error } from "./me-v1"
import { getV1RequestContext, type V1RequestContext } from "./v1-transport"

const restApiUrl = () => process.env.NEXT_PUBLIC_BACKEND_REST_API || ""

/** Cache tag the backend's B2B flush fires (revalidate.ts B2B_PORTAL_REVALIDATE_TAG). */
export const CMS_FLUSH_TAG = "cms-pages"

/** The v1 Language enum is lowercase (`en`, `fr`, `de`, ...). */
export const v1Lang = (l: string | null | undefined) => (l || "en").toLowerCase()
export const seg = (s: string) => encodeURIComponent(s)

/**
 * Caller-independent v1 GET: no Authorization, no acting header, no BFF
 * headers (so nothing per-user reaches the request or a cache key).
 */
export function v1SharedGet<T>(path: string, query?: V1Query): Promise<T> {
  return v1DataGet<T>(
    { restApiUrl: restApiUrl(), bffHeaders: async () => ({}) },
    { path, query }
  )
}

/** Session v1 GET (bearer when the session has one; BFF headers). */
export function v1SessionGet<T>(
  bearer: string | null,
  path: string,
  query?: V1Query
): Promise<T> {
  return v1DataGet<T>({ restApiUrl: restApiUrl() }, { path, query, bearer })
}

/** Session v1 POST with a JSON body (public forms). */
export function v1SessionPost<T>(
  bearer: string | null,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return v1DataPost<T>({ restApiUrl: restApiUrl() }, { path, body, bearer })
}

/**
 * The request context, or a true guest's when there is no request scope to
 * read (e.g. a background job): a guest sees less, never more.
 */
export async function cmsRequestContext(): Promise<V1RequestContext> {
  try {
    return await getV1RequestContext()
  } catch {
    return { transport: "v1", identity: "guest", bearer: null, hasLegacyJwt: false }
  }
}

/**
 * Runs a session-dependent CMS read on this request's transport:
 *   graphql transport -> graphql()
 *   v1                -> v1(bearer | null); a v1 401 -> graphql() for this
 *                        call; any other failure -> logged, onError(e)
 *                        (fail closed: what a GraphQL error gave, i.e. no
 *                        page / empty list / null settings).
 */
export async function runCmsCall<T>(
  label: string,
  calls: {
    v1: (bearer: string | null, ctx: V1RequestContext) => Promise<T>
    graphql: () => Promise<T>
    onError: (error: unknown) => T
  }
): Promise<T> {
  const ctx = await cmsRequestContext()
  if (ctx.transport === "graphql") return calls.graphql()
  try {
    return await calls.v1(ctx.bearer, ctx)
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401 && error.code !== "PRIVATE_PAGE") {
      console.warn(`[cms-v1] ${label}: 401, using the GraphQL path`)
      return calls.graphql()
    }
    if (!(isV1ProblemError(error) && error.status === 404)) {
      console.error(`[cms-v1] ${label} failed:`, describeV1Error(error))
    }
    return calls.onError(error)
  }
}
