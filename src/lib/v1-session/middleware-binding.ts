import "server-only"

/**
 * Middleware binding of the v1 session client (stage 2c-2, DORMANT: not
 * imported by src/middleware.ts). Kept apart from ./server.ts so middleware
 * never pulls in next/headers.
 *
 * Usage (2c-3) — the binding owns the exit path, so a rotated token cannot be
 * dropped by forgetting to copy cookies:
 *
 *   export async function middleware(request: NextRequest) {
 *     return withV1Session(request, ({ result, next }) => {
 *       if (needsLogin && result.kind !== "ok") {
 *         return NextResponse.redirect(loginUrl)   // cookies are applied too
 *       }
 *       return next()                              // forwards the new cookies downstream
 *     })
 *   }
 *
 * Every response the handler returns — next(), NextResponse.redirect(),
 * NextResponse.rewrite(), a plain NextResponse — gets the cookie writes.
 * `next(init)` must be used instead of NextResponse.next(): it also rewrites
 * the downstream request's cookie header, so the render / action of this
 * same request sees the fresh access token and never refreshes again with the
 * rotated-away token (middleware (edge) and node have separate de-dup maps).
 * A redirect needs no forwarding: the browser's next request carries the new
 * cookies. If the handler throws, the writes are lost for this response, but
 * the pair stays in this isolate's memo and the next request still gets it.
 *
 * Prefetch requests never trigger a refresh (see isPrefetchRequest):
 * `result.kind` is then "ok" when the access cookie is usable, else "deferred".
 */
import { NextResponse, type NextRequest } from "next/server"
import { getProxyClientIpFromHeaders } from "../util/client-ip"
import {
  createRecordingCookieJar,
  forwardedCookieHeader,
  isPrefetchRequest,
} from "./middleware-jar"
import { readV1Session } from "./read"
import {
  MIDDLEWARE_WAIT_MS,
  ensureFreshV1Session,
  type V1EnsureResult,
} from "./refresh"
import { v1CookiesSecure as secure, v1SessionClient as client } from "./instance"

export interface V1MiddlewareSession {
  result: V1EnsureResult
  /** NextResponse.next() that also forwards the rotated cookies downstream. */
  next(init?: { headers?: HeadersInit; status?: number }): NextResponse
}

export async function withV1Session(
  request: NextRequest,
  handler: (session: V1MiddlewareSession) => NextResponse | Promise<NextResponse>
): Promise<NextResponse> {
  const jar = createRecordingCookieJar((name) => request.cookies.get(name)?.value)
  let result: V1EnsureResult
  if (isPrefetchRequest(request.headers)) {
    const read = readV1Session(jar)
    result =
      read.status === "ok"
        ? { kind: "ok", accessToken: read.accessToken, refreshed: false }
        : read.status === "anonymous"
        ? { kind: "anonymous", cleared: "none" }
        : { kind: "deferred" }
  } else {
    result = await ensureFreshV1Session(
      client(),
      jar,
      {
        clientIp: getProxyClientIpFromHeaders(request.headers),
        userAgent: request.headers.get("user-agent"),
      },
      { secure: secure(), waitMs: MIDDLEWARE_WAIT_MS }
    )
  }
  const writes = jar.writes()

  const next: V1MiddlewareSession["next"] = (init) => {
    if (writes.length === 0) return NextResponse.next(init)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("cookie", forwardedCookieHeader(request.headers.get("cookie"), writes))
    return NextResponse.next({ ...init, request: { headers: requestHeaders } })
  }

  const response = await handler({ result, next })
  writes.forEach((w) => response.cookies.set(w.name, w.value, w.options))
  return response
}
