import "server-only"

/**
 * Magic-link request and verify on v1 (stage 2c-3). Pure: takes the
 * V1SessionClient and a request context, touches no cookie and imports no
 * next/*; the server actions in src/lib/data/customer.ts wire it to cookies
 * (storeV1TokensInAction, setAuthToken, logoutV1SessionInAction).
 *
 * Backend contract (furnisystems-backend src/api/v1/modules/auth/):
 *   POST /api/v1/auth/magic-link/request  { email, language? }
 *     202 for every address (unknown ones too), 429 rate limited,
 *     400 invalid body (strict: `language` must be a Language enum value)
 *   POST /api/v1/auth/magic-link/verify   { token }
 *     200 { accessToken, expiresIn, legacyToken, session } + the refresh
 *     token in Set-Cookie; 401 UNAUTHENTICATED is ONE answer for unknown,
 *     expired, used and blocked links; 429 rate limited.
 *
 * Old vs new emailed links share one URL (`/auth/magic-link?token=`), so the
 * token's SHAPE decides the path (brief §2 rule 1); the shapes cannot overlap
 * (only a JWT contains dots). Never decode a v1 token, never try both paths.
 *
 * Logging: never the token, the email, a cookie or a body; one warn per
 * failure with the status, the problem code and the requestId.
 */
import {
  classifyFailure,
  isTransientFailure,
  parseTokenResponse,
  type V1RequestContext,
  type V1SessionClient,
  type V1Tokens,
} from "./refresh"

/** Exactly the backend's isOpaqueTokenShape (src/auth/sessions.ts). */
const V1_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/
/** A JWS: three base64url segments (legacy HS256 magic-link JWT). */
const LEGACY_TOKEN_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
/** The backend's MagicLinkVerifyBodySchema max. */
const MAX_TOKEN_LENGTH = 512

export type MagicLinkTokenKind = "v1" | "legacy" | "invalid"

/** `token` is the already URL-decoded query value. */
export function classifyMagicLinkToken(token: unknown): MagicLinkTokenKind {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return "invalid"
  }
  if (V1_TOKEN_SHAPE.test(token)) return "v1"
  if (LEGACY_TOKEN_SHAPE.test(token)) return "legacy"
  return "invalid"
}

/**
 * The backend `Language` enum (prisma/schema.prisma). The v1 request schema
 * is strict: anything else is 400, so unknown values are omitted instead.
 */
const BACKEND_LANGUAGES = [
  "lt", "lv", "et", "en", "ru", "pl", "de", "fr", "es", "dk", "pt", "nl", "it",
  "sk", "sv", "uk", "fi", "no", "da", "zh", "ja", "ko", "ar", "hi", "tr", "ua",
  "cs", "hu", "ro", "bg", "hr", "sr", "sl",
]

/** The form's `language` (the URL locale) as a backend Language, or undefined. */
export function magicLinkRequestLanguage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const code = value.trim().toLowerCase()
  // The portal's Danish locale is `da`; the backend's primary Danish code is `dk`.
  const mapped = code === "da" ? "dk" : code
  return BACKEND_LANGUAGES.indexOf(mapped) === -1 ? undefined : mapped
}

export type MagicLinkRequestOutcome = "sent" | "rate-limited" | "error" | "unavailable"

export async function requestV1MagicLink(
  client: V1SessionClient,
  input: { email: string; language?: unknown },
  ctx: V1RequestContext
): Promise<MagicLinkRequestOutcome> {
  const language = magicLinkRequestLanguage(input.language)
  const response = await client.postAuth(
    "/auth/magic-link/request",
    { email: input.email, ...(language ? { language } : {}) },
    ctx
  )
  if (isTransientFailure(response)) {
    // postAuth already logged the network / timeout / config problem.
    return "unavailable"
  }
  if (response.ok) {
    discard(response)
    return "sent"
  }
  const failure = await classifyFailure(response)
  const status = failure.kind === "rejected" ? 401 : failure.status
  console.warn("[magic-link] request failed", {
    status: status ?? null,
    code: failure.kind === "error" ? failure.code ?? null : "UNAUTHENTICATED",
    requestId: failure.requestId ?? null,
  })
  if (status === 429) return "rate-limited"
  if (status !== undefined && status >= 400 && status < 500) return "error"
  return "unavailable"
}

export type MagicLinkVerifyOutcome =
  /** A usable pair WITH the GraphQL transition token. */
  | { kind: "ok"; tokens: V1Tokens & { legacyToken: string } }
  /** 401: unknown, expired, already used or blocked (D6). */
  | { kind: "expired" }
  /** 429, 5xx, network, timeout, config: the link may still be good. */
  | { kind: "unavailable" }
  /** 2xx without a usable pair (the link is spent), or a 4xx contract error. */
  | { kind: "error" }

export async function verifyV1MagicLink(
  client: V1SessionClient,
  token: string,
  ctx: V1RequestContext
): Promise<MagicLinkVerifyOutcome> {
  const response = await client.postAuth("/auth/magic-link/verify", { token }, ctx)
  if (isTransientFailure(response)) return { kind: "unavailable" }
  if (response.ok) {
    const requestId = response.headers.get("x-request-id")
    const tokens = await parseTokenResponse(response)
    if (!tokens || !tokens.legacyToken) {
      console.warn("[magic-link] verify answered 2xx without a usable token pair", {
        requestId: requestId ?? null,
      })
      return { kind: "error" }
    }
    return { kind: "ok", tokens: tokens as V1Tokens & { legacyToken: string } }
  }
  const failure = await classifyFailure(response)
  if (failure.kind === "rejected") {
    console.warn("[magic-link] verify rejected", {
      status: 401,
      code: "UNAUTHENTICATED",
      requestId: failure.requestId ?? null,
    })
    return { kind: "expired" }
  }
  console.warn("[magic-link] verify failed", {
    status: failure.status ?? null,
    code: failure.code ?? null,
    requestId: failure.requestId ?? null,
  })
  return failure.retryable ? { kind: "unavailable" } : { kind: "error" }
}

function discard(response: Response) {
  try {
    if (response.body && !response.bodyUsed) response.body.cancel().catch(() => undefined)
  } catch {
    // Already consumed.
  }
}
