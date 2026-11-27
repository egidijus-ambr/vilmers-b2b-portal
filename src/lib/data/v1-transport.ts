import "server-only"

/**
 * Request-scoped decision v1 vs GraphQL, shared by every migrated surface
 * (catalogue listings, BFF proxies, orders, palettes, selector, identity).
 * The rule itself (and when to delete all of this) is in ./v1-transport-rule.ts.
 *
 * The session is resolved with refresh-on-demand
 * (src/lib/v1-session/on-demand.ts): in route handlers and server actions an
 * expired access token is refreshed here (rotated cookies go out on this
 * response); in a server-component render the same call only reads (cookies
 * are not writable there, so nothing is sent to the backend) and a
 * `needs-refresh` session takes the GraphQL path, as before.
 *
 * Memoised per request with React `cache` in renders. Route handlers have no
 * React request scope, so there it runs per call; that is safe because a
 * second refresh of the same token is answered from the process-wide memo
 * (no second backend request) and rewrites the same cookie values.
 * Never put the result (it holds the bearer) in any shared cache.
 */
import { cache } from "react"
import { cookies } from "next/headers"
import {
  LEGACY_SESSION_COOKIE,
  resolveV1SessionInHandler,
} from "@lib/v1-session/server"
import { getV1SessionForRender } from "@lib/v1-session/render"
import {
  effectiveV1Status,
  selectIdentityTransport,
  selectV1Transport,
  type IdentityTransport,
  type V1SessionStatus,
  type V1Transport,
} from "./v1-transport-rule"

export type { IdentityTransport, V1Transport }

export interface V1RequestContext {
  /** Catalogue listings (a true guest is served by v1). */
  transport: V1Transport
  /** Identity surfaces (a true guest makes no call). */
  identity: IdentityTransport
  /** v1 access token, only when the session is usable on v1. */
  bearer: string | null
  /** A `_furni_jwt` cookie is present (decides the 401 fallback). */
  hasLegacyJwt: boolean
}

async function resolveSession(): Promise<{
  status: V1SessionStatus
  accessToken: string | null
  endedLegacy: boolean
}> {
  try {
    const r = await resolveV1SessionInHandler()
    return {
      status: r.status,
      accessToken: r.status === "ok" ? r.accessToken : null,
      endedLegacy: r.status === "anonymous" && r.endedLegacy,
    }
  } catch (error) {
    // Unexpected (e.g. outside a request): read-only, never a refresh.
    console.warn(
      "[v1-transport] session resolution failed, read-only fallback:",
      (error as { name?: unknown } | null)?.name ?? "Error"
    )
    const read = await getV1SessionForRender()
    return {
      status: read.status,
      accessToken: read.status === "ok" ? read.accessToken : null,
      endedLegacy: false,
    }
  }
}

export const getV1RequestContext = cache(
  async (): Promise<V1RequestContext> => {
    const session = await resolveSession()
    const store = await cookies()
    const hasLegacyJwt =
      !session.endedLegacy && Boolean(store.get(LEGACY_SESSION_COOKIE)?.value)
    const status = effectiveV1Status(session.status, hasLegacyJwt)
    return {
      transport: selectV1Transport(status, hasLegacyJwt),
      identity: selectIdentityTransport(status, hasLegacyJwt),
      bearer: status === "ok" ? session.accessToken : null,
      hasLegacyJwt,
    }
  }
)
