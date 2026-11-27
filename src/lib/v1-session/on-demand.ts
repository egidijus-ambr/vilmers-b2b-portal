import "server-only"

/**
 * Refresh-on-demand for route handlers and server actions (portal REST
 * migration slices 6/7). Pure: takes the V1SessionClient, a WritableCookieJar
 * and a request context; the Next.js binding is
 * ./server.ts resolveV1SessionInHandler.
 *
 * Why: `/api/*` is outside the middleware matcher, so an access token that
 * expired since the last page navigation is never refreshed for the BFF
 * proxies (invoice, files, Tawk) or the catalogue builder's JSON routes;
 * without this they fell back to GraphQL / legacy REST while the page used v1.
 *
 * What it does — the middleware's rules (./middleware-binding.ts), minus the
 * logout side effects that stay the middleware's job:
 *   - `_furni_jwt` (the companion) absent  -> "anonymous". An orphan v1
 *     session is never refreshed and its access token is never used; the
 *     next page navigation's middleware logs it out and clears it.
 *   - usable access cookie                 -> "ok", no network, no write.
 *   - no refresh cookie                    -> "anonymous".
 *   - needs-refresh                        -> ensureFreshV1Session (the ONLY
 *     rotation code): proves the jar writable FIRST (a server-component
 *     render throws there, before any backend call -> "needs-refresh",
 *     reason "not-writable"), then refreshes through the process-wide
 *     client (in-flight de-dup + memo, ./refresh.ts header):
 *       refreshed                          -> "ok" (cookies rotated on THIS
 *                                             response; the browser keeps them)
 *       definitive 401 / invalid           -> both v1 cookies cleared AND
 *                                             `_furni_jwt` deleted (D5, as the
 *                                             middleware does) -> "anonymous"
 *       503 / 429 / timeout / network /    -> "needs-refresh", reason
 *       409 REFRESH_SUPERSEDED                "unavailable"; cookies untouched
 *
 * Concurrency (why this does not break the middleware's rotation):
 *   - same node process: every route handler / action shares ONE client
 *     (./instance.ts), so N parallel calls presenting the same refresh token
 *     cause ONE backend request and all get the same pair (in-flight map);
 *     later stragglers get it from the memo (>= 60 s) and never re-present
 *     a retired token.
 *   - middleware vs route handler: the middleware runs in the edge sandbox,
 *     a separate module instance with its own client, so their maps are NOT
 *     shared. If both rotate the same token at once, the backend's grace
 *     answers the second presentation (< 30 s) with the SAME pair, and a
 *     third with 409 REFRESH_SUPERSEDED (nothing revoked -> "unavailable"
 *     here, the caller takes its fallback; the browser already holds the
 *     newer cookie from the sibling response). Each side then answers later
 *     presentations of the old token from its own memo for >= 60 s, so a
 *     retired token is not re-sent >= 30 s after rotation by either side
 *     (that would revoke the session). verify-v1-session.ts covers it with
 *     two independent clients on one FakeBackend.
 *   - server actions are POSTs to locale paths, so the middleware has
 *     normally refreshed already and forwarded the new cookie downstream;
 *     this then just reads "ok".
 */
import {
  V1CookiesNotWritableError,
  v1CookieOptions,
  type WritableCookieJar,
} from "./cookies"
import { readV1Session } from "./read"
import {
  ensureFreshV1Session,
  type V1RequestContext,
  type V1SessionClient,
} from "./refresh"

export type V1OnDemandResult =
  | { status: "ok"; accessToken: string; refreshed: boolean }
  /** Not usable on v1 for this call; the session may still be alive. */
  | { status: "needs-refresh"; reason: "not-writable" | "unavailable" }
  /** No (usable) v1 session. `endedLegacy`: `_furni_jwt` was deleted (D5). */
  | { status: "anonymous"; endedLegacy: boolean }

export interface V1OnDemandOptions {
  secure: boolean
  /** The companion cookie (`_furni_jwt`). */
  companionCookie: string
  waitMs?: number
  nowMs?: number
}

export async function resolveV1SessionOnDemand(
  client: V1SessionClient,
  jar: WritableCookieJar,
  ctx: V1RequestContext,
  options: V1OnDemandOptions
): Promise<V1OnDemandResult> {
  if (!jar.get(options.companionCookie)) {
    return { status: "anonymous", endedLegacy: false }
  }
  const read = readV1Session(jar, options.secure, options.nowMs)
  if (read.status === "ok") {
    return { status: "ok", accessToken: read.accessToken, refreshed: false }
  }
  if (read.status === "anonymous") return { status: "anonymous", endedLegacy: false }

  let result
  try {
    result = await ensureFreshV1Session(client, jar, ctx, {
      secure: options.secure,
      waitMs: options.waitMs,
      nowMs: options.nowMs,
    })
  } catch (error) {
    if (
      error instanceof V1CookiesNotWritableError ||
      (error as { name?: unknown } | null)?.name === "V1CookiesNotWritableError"
    ) {
      return { status: "needs-refresh", reason: "not-writable" }
    }
    throw error
  }
  if (result.kind === "ok") {
    return { status: "ok", accessToken: result.accessToken, refreshed: result.refreshed }
  }
  if (result.kind === "anonymous") {
    if (result.cleared === "all") {
      // D5: a definitive v1 "invalid" also ends the GraphQL session.
      jar.set(options.companionCookie, "", v1CookieOptions(options.secure, 0))
      return { status: "anonymous", endedLegacy: true }
    }
    return { status: "anonymous", endedLegacy: false }
  }
  // "unavailable" (and "deferred", which only the middleware produces).
  return { status: "needs-refresh", reason: "unavailable" }
}
