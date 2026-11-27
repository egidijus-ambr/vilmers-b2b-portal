import "server-only"

/**
 * Staff -> portal impersonation on v1 (stage 2c-4). Pure: takes the
 * V1SessionClient and a request context, touches no cookie and imports no
 * next/*; the server action in src/app/[languageCode]/(main)/auth/impersonation/
 * wires it to cookies.
 *
 * Backend contract (furnisystems-backend src/api/v1/modules/admin/impersonation/):
 *   POST /api/v1/admin/customers/:id/impersonation   (saas-admin-ui, staff)
 *     201 { handoffCode, portalUrl, expiresIn }: 60 s, single use, bound to
 *     (staffId, customerId, the staff browser's IP).
 *   POST /api/v1/auth/impersonation/exchange  { handoffCode }   (this BFF)
 *     200 { accessToken, expiresIn, legacyToken, session } + the refresh
 *     token in Set-Cookie (an impersonation session, 8 h absolute);
 *     401 UNAUTHENTICATED for unknown / used / expired / IP-mismatched codes
 *     and for targets no longer allowed; 400 when an Authorization header is
 *     sent (never send one); 429 rate limited; 503 without Redis.
 *   The end user's IP must reach the backend via x-bff-secret + x-client-ip
 *   (postAuth adds them) or the IP binding never matches.
 *
 * Logging: never the code, a token, a cookie or a body; one warn per failure
 * with the status, the problem code and the requestId.
 */
import {
  classifyFailure,
  isTransientFailure,
  parseTokenResponse,
  type V1RequestContext,
  type V1SessionClient,
  type V1Tokens,
} from "./refresh"

/** The backend's isOpaqueTokenShape (src/auth/sessions.ts): handoff codes are opaque tokens. */
const HANDOFF_CODE_SHAPE = /^[A-Za-z0-9_-]{43}$/

export function isHandoffCodeShape(code: unknown): code is string {
  return typeof code === "string" && HANDOFF_CODE_SHAPE.test(code)
}

export type ImpersonationExchangeOutcome =
  /** A usable pair WITH the GraphQL transition token. */
  | { kind: "ok"; tokens: V1Tokens & { legacyToken: string } }
  /** 401: unknown, used, expired, other IP, or the target is no longer allowed. */
  | { kind: "expired" }
  /** 429, 5xx, network, timeout, config: the code may still be unused. */
  | { kind: "unavailable" }
  /** 2xx without a usable pair (the code is spent), or a 4xx contract error. */
  | { kind: "error" }

export async function exchangeV1Impersonation(
  client: V1SessionClient,
  handoffCode: string,
  ctx: V1RequestContext
): Promise<ImpersonationExchangeOutcome> {
  if (!isHandoffCodeShape(handoffCode)) return { kind: "expired" }
  const response = await client.postAuth(
    "/auth/impersonation/exchange",
    { handoffCode },
    ctx
  )
  if (isTransientFailure(response)) return { kind: "unavailable" }
  if (response.ok) {
    const requestId = response.headers.get("x-request-id")
    const tokens = await parseTokenResponse(response)
    if (!tokens || !tokens.legacyToken) {
      console.warn("[impersonation] exchange answered 2xx without a usable token pair", {
        requestId: requestId ?? null,
      })
      return { kind: "error" }
    }
    return { kind: "ok", tokens: tokens as V1Tokens & { legacyToken: string } }
  }
  const failure = await classifyFailure(response)
  if (failure.kind === "rejected") {
    console.warn("[impersonation] exchange rejected", {
      status: 401,
      code: "UNAUTHENTICATED",
      requestId: failure.requestId ?? null,
    })
    return { kind: "expired" }
  }
  console.warn("[impersonation] exchange failed", {
    status: failure.status ?? null,
    code: failure.code ?? null,
    requestId: failure.requestId ?? null,
  })
  return failure.retryable ? { kind: "unavailable" } : { kind: "error" }
}
