import "server-only"

/**
 * Middleware binding of the v1 session client (stage 2c-2; wired into
 * src/middleware.ts in 2c-3). Kept apart from ./server.ts so middleware
 * never pulls in next/headers.
 *
 * Usage — the binding owns the exit path, so a rotated token cannot be
 * dropped by forgetting to copy cookies:
 *
 *   export async function middleware(request: NextRequest) {
 *     return withV1Session(request, ({ result, next, deleteCookie }) => {
 *       if (result.kind === "anonymous" && result.cleared === "all") {
 *         deleteCookie("_furni_jwt")            // BEFORE next(): forwarded too
 *       }
 *       return next({ requestHeaders })         // keeps extra request headers
 *     }, { companionCookie: "_furni_jwt" })
 *   }
 *
 * Rules (2c-3, furnisystems-backend docs/briefs/stage-2c-3.md §2 / B3):
 *   - this is the ONLY place a refresh happens. Server actions and route
 *     handlers only store a pair (verify) or log out; a route handler outside
 *     the matcher calling ensureV1SessionInAction would present the same
 *     refresh token a second time. Parallel refreshes are de-duplicated by
 *     the client (in-flight map + memo, ./refresh.ts header);
 *   - never redirect to login on `deferred` (a prefetch; a redirect could be
 *     cached by the router for that link) or `unavailable` (503 / timeout /
 *     network / 429 / 409 REFRESH_SUPERSEDED: the session is alive, the
 *     browser's next request carries the newer cookie), and never clear a
 *     cookie on those. In 2c-3 the middleware never redirects to login at all;
 *   - only `anonymous` + `cleared: "all"` (a definitive refresh 401, or a
 *     locally invalid token) is definitive; `cleared: "none"` (no v1 cookie at
 *     all) is the normal state of every pre-2c-3 / legacy-link login;
 *   - orphan rule (`companionCookie`): v1 cookies present while the companion
 *     (`_furni_jwt`) is absent means the GraphQL side ended the login. The
 *     session is NOT refreshed: the binding logs it out best-effort (bounded
 *     by MIDDLEWARE_WAIT_MS, the request keeps running) and clears both v1
 *     cookies whatever the outcome; `result` is then anonymous / cleared all
 *     and `orphanEnded` is true. Safe only because every writer of
 *     `_furni_jwt` uses SameSite=Lax like the v1 cookies (./cookies.ts).
 *
 * Every response the handler returns — next(), NextResponse.redirect(),
 * NextResponse.rewrite(), a plain NextResponse — gets the cookie writes
 * (rotations, clears, and the handler's own deleteCookie calls).
 * `next(init)` must be used instead of NextResponse.next(): it also rewrites
 * the downstream request's cookie header, so the render / action of this
 * same request sees the fresh access token (and never refreshes again with
 * the rotated-away token) and does not see a cookie deleted here.
 * `init.requestHeaders` are the downstream request headers to start from
 * (e.g. with `x-pathname` added); the cookie forwarding is merged into them.
 * `init.headers` are RESPONSE headers, as in NextResponse.next(). Call
 * deleteCookie() before next(): a deletion recorded after next() still
 * reaches the response, but not the downstream request.
 * A redirect needs no forwarding: the browser's next request carries the new
 * cookies. If the handler throws, the writes are lost for this response, but
 * the pair stays in this isolate's memo and the next request still gets it.
 *
 * Prefetch requests never trigger a refresh and never end an orphan (no
 * network, no cookie write; see isPrefetchRequest): `result.kind` is then
 * "ok" when the access cookie is usable, else "deferred" / anonymous.
 *
 * The "stop waiting without aborting" design relies on a long-lived process
 * (pm2 + next start), not serverless edge.
 */
import { NextResponse, type NextRequest } from "next/server"
import { getProxyClientIpFromHeaders } from "../util/client-ip"
import { v1CookieNames, v1CookieOptions, type V1CookieNames } from "./cookies"
import {
  createRecordingCookieJar,
  forwardedCookieHeader,
  isPrefetchRequest,
} from "./middleware-jar"
import { readV1Session } from "./read"
import {
  MIDDLEWARE_WAIT_MS,
  clearV1SessionCookies,
  ensureFreshV1Session,
  type V1EnsureResult,
  type V1RequestContext,
} from "./refresh"
import { v1CookiesSecure as secure, v1SessionClient as client } from "./instance"

export interface V1MiddlewareNextInit {
  /** Downstream request headers to start from (default: the request's). */
  requestHeaders?: Headers
  /** Response headers, as in NextResponse.next({ headers }). */
  headers?: HeadersInit
  status?: number
}

export interface V1MiddlewareSession {
  result: V1EnsureResult
  /** An orphan v1 session (companion cookie absent) was ended on this request. */
  orphanEnded: boolean
  /** The v1 cookie names in effect (by the Secure flag). */
  names: V1CookieNames
  /** NextResponse.next() that also forwards the cookie writes downstream. */
  next(init?: V1MiddlewareNextInit): NextResponse
  /**
   * Deletes a cookie (Path=/, same attributes as the v1 cookies) on the
   * response AND in the downstream request's cookie header. Call before next().
   */
  deleteCookie(name: string): void
}

export interface WithV1SessionOptions {
  /**
   * The cookie that must accompany a v1 session (`_furni_jwt`). v1 cookies
   * without it are an orphan: logged out best-effort and cleared, never
   * refreshed. Omit to disable the rule.
   */
  companionCookie?: string
  /** How long to wait for the orphan logout (default MIDDLEWARE_WAIT_MS). */
  orphanLogoutWaitMs?: number
}

/** Waits at most `ms` for `promise`; never rejects; the promise keeps running. */
async function waitAtMost<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms)
  })
  try {
    return await Promise.race([promise.catch(() => undefined), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function withV1Session(
  request: NextRequest,
  handler: (session: V1MiddlewareSession) => NextResponse | Promise<NextResponse>,
  options: WithV1SessionOptions = {}
): Promise<NextResponse> {
  const isSecure = secure()
  const names = v1CookieNames(isSecure)
  const jar = createRecordingCookieJar((name) => request.cookies.get(name)?.value)
  const ctx: V1RequestContext = {
    clientIp: getProxyClientIpFromHeaders(request.headers),
    userAgent: request.headers.get("user-agent"),
  }
  const hasV1Cookie = !!(jar.get(names.access) || jar.get(names.refresh))
  const isOrphan =
    !!options.companionCookie && hasV1Cookie && !jar.get(options.companionCookie)

  let result: V1EnsureResult
  let orphanEnded = false
  if (isPrefetchRequest(request.headers)) {
    const read = readV1Session(jar, isSecure)
    result =
      read.status === "ok" && !isOrphan
        ? { kind: "ok", accessToken: read.accessToken, refreshed: false }
        : read.status === "anonymous"
        ? { kind: "anonymous", cleared: "none" }
        : { kind: "deferred" }
  } else if (isOrphan) {
    const refreshToken = jar.get(names.refresh)
    if (refreshToken) {
      await waitAtMost(
        client().logout(refreshToken, ctx, jar.get(names.access)),
        options.orphanLogoutWaitMs ?? MIDDLEWARE_WAIT_MS
      )
    }
    clearV1SessionCookies(jar, { secure: isSecure })
    result = { kind: "anonymous", cleared: "all" }
    orphanEnded = true
  } else {
    result = await ensureFreshV1Session(client(), jar, ctx, {
      secure: isSecure,
      waitMs: MIDDLEWARE_WAIT_MS,
    })
  }

  const next: V1MiddlewareSession["next"] = (init = {}) => {
    const { requestHeaders, ...responseInit } = init
    const writes = jar.writes()
    if (writes.length === 0 && !requestHeaders) return NextResponse.next(responseInit)
    const downstream = new Headers(requestHeaders ?? request.headers)
    if (writes.length > 0) {
      downstream.set("cookie", forwardedCookieHeader(request.headers.get("cookie"), writes))
    }
    return NextResponse.next({ ...responseInit, request: { headers: downstream } })
  }

  const deleteCookie: V1MiddlewareSession["deleteCookie"] = (name) => {
    jar.set(name, "", v1CookieOptions(isSecure, 0))
  }

  const response = await handler({ result, orphanEnded, names, next, deleteCookie })
  jar.writes().forEach((w) =>
    response.cookies.set(
      w.name,
      w.value,
      w.options.maxAge <= 0 ? { ...w.options, expires: EPOCH } : w.options
    )
  )
  return response
}

/**
 * Deletions also carry `Expires=Thu, 01 Jan 1970`. Next.js (15.5) re-parses
 * the middleware's Set-Cookie headers into the render's request store
 * (x-middleware-set-cookie, request-store.js mergeMiddlewareCookies) and
 * re-emits them on a page-level redirect(); its parser drops `Max-Age=0`, so
 * without Expires a deletion comes back as an empty SESSION cookie. Verified
 * on a production build (2c-3).
 */
const EPOCH = new Date(0)
