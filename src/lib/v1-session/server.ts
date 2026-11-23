import "server-only"

/**
 * Next.js bindings of the v1 session client for server actions and route
 * handlers (stage 2c-2; live since 2c-3: magic-link request / verify, logout,
 * /api/clear-session and the GraphQL impersonation landing use it).
 *
 * 2c-3 rule: server actions and route handlers only STORE a pair
 * (storeV1TokensInAction, after verify) or LOG OUT (logoutV1SessionInAction).
 * None calls ensureV1SessionInAction: the middleware (./middleware-binding.ts)
 * is the single refresh site, and a route handler outside its matcher
 * (/api/*) would present the same refresh token a second time.
 *
 * Which function is safe where:
 *
 *   getV1SessionForRender()          server components (render), and anywhere —
 *                                    in ./render.ts, which imports nothing that
 *                                    can fetch or write. Read-only.
 *   ensureV1SessionInAction()        server actions and route handlers ONLY.
 *   logoutV1SessionInAction()        server actions and route handlers ONLY.
 *   storeV1TokensInAction()          server actions and route handlers ONLY
 *                                    (after verify / exchange, 2c-3 / 2c-4).
 *   withV1Session()                  middleware ONLY — in ./middleware-binding.ts.
 *
 * Enforced, not just documented: the cookie jar here probes writability
 * (a deletion of the never-set `_furni_v1_probe` cookie) before any rotation
 * request; in a server-component render Next.js throws on that write, which
 * becomes V1CookiesNotWritableError before the backend is called.
 */
import { cookies, headers } from "next/headers"
import { getProxyClientIpFromHeaders } from "../util/client-ip"
import {
  V1CookiesNotWritableError,
  v1CookieNames,
  v1CookieOptions,
  type WritableCookieJar,
} from "./cookies"
import {
  ACTION_WAIT_MS,
  ensureFreshV1Session,
  logoutV1Session,
  writeV1SessionCookies,
  type V1EnsureResult,
  type V1RequestContext,
  type V1Tokens,
} from "./refresh"
import { v1CookiesSecure as secure, v1SessionClient as client } from "./instance"

async function nextCookieJar(): Promise<WritableCookieJar> {
  const store = await cookies()
  return {
    get: (name) => store.get(name)?.value,
    set: (name, value, options) => {
      store.set(name, value, options)
    },
    assertWritable: () => {
      try {
        store.set(v1CookieNames(secure()).probe, "", v1CookieOptions(secure(), 0))
      } catch {
        throw new V1CookiesNotWritableError()
      }
    },
  }
}

async function requestContext(): Promise<V1RequestContext> {
  const h = await headers()
  return {
    clientIp: getProxyClientIpFromHeaders(h),
    userAgent: h.get("user-agent"),
  }
}

/** Server actions / route handlers: a usable access token, refreshing if needed. */
export async function ensureV1SessionInAction(
  options: { force?: boolean } = {}
): Promise<V1EnsureResult> {
  return ensureFreshV1Session(client(), await nextCookieJar(), await requestContext(), {
    secure: secure(),
    force: options.force,
    waitMs: ACTION_WAIT_MS,
  })
}

/** Server actions / route handlers: store a pair from verify / exchange. */
export async function storeV1TokensInAction(tokens: V1Tokens): Promise<void> {
  const jar = await nextCookieJar()
  jar.assertWritable()
  writeV1SessionCookies(jar, tokens, { secure: secure() })
}

/**
 * Server actions / route handlers: explicit logout of THIS session only
 * (POST /auth/logout, never logout-all; D5). Always clears both v1 cookies
 * locally; waits at most ACTION_WAIT_MS for the backend. A no-op towards the
 * backend when there is no v1 refresh cookie.
 */
export async function logoutV1SessionInAction() {
  return logoutV1Session(client(), await nextCookieJar(), await requestContext(), {
    secure: secure(),
    waitMs: ACTION_WAIT_MS,
  })
}

/** Request context for postAuth callers (2c-3 verify, 2c-4 exchange). */
export async function v1RequestContextInAction(): Promise<V1RequestContext> {
  return requestContext()
}
