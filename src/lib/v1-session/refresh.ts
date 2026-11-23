import "server-only"

/**
 * v1 session client core (stage 2c-2; live since 2c-3: the middleware refreshes
 * through it, the magic-link / logout server actions store and end sessions). Server-side BFF client for furnisystems-backend /api/v1/auth/*.
 *
 * Pure and edge-safe (fetch + timers only; no next/*, no Buffer, no
 * node:crypto), so the same code runs in middleware (edge) and in server
 * actions / route handlers (node). The Next.js bindings live in ./server.ts
 * and ./middleware-binding.ts.
 *
 * Contract (furnisystems-backend, develop + fix/refresh-superseded 32c55c7):
 *   POST /api/v1/auth/refresh   src/api/v1/modules/auth/routes.ts refreshRoute,
 *                               controller.ts `refresh`, common.ts `mapSessionError`
 *     body  `{ "refreshToken": "<opaque>" }`, Content-Type: application/json,
 *           no Origin (server-side), + x-bff-secret / x-client-ip, user-agent
 *     200   `{ accessToken, expiresIn, session: { sid, realm, expiresAt } }`
 *           + Set-Cookie with the ROTATED refresh token (only place it is sent)
 *     409   REFRESH_SUPERSEDED (problem+json), Retry-After: 1, no Set-Cookie,
 *           nothing revoked: this live session rotated away from the token
 *           < 30 s ago and the grace is used, or this request lost a parallel
 *           rotation (sessions.ts retiredTokenPresented / the !committed
 *           branch, common.ts mapSessionError). A sibling response holds the
 *           newer pair. Re-presenting THIS token >= 30 s after its rotation
 *           revokes the session, so it is never re-sent.
 *     401   UNAUTHENTICATED (problem+json): definitive — unknown / garbage
 *           token, another session's token, inactive / revoked / expired
 *           session, or reuse >= 30 s (which has just revoked the session).
 *     403   Origin not allowed; 415 wrong content type (csrfGuard)
 *     503   SERVICE_UNAVAILABLE (session store down / lock busy), Retry-After
 *     500   any other failure (e.g. the rotation transaction failed; nothing
 *           committed, the grace entry is dropped)
 *   POST /api/v1/auth/logout    same body rules; 204 whether or not a session
 *                               was found; 403 / 503
 *
 * Rotation rules (src/auth/sessions.ts): every refresh rotates; the old token
 * is accepted ONCE more within 30 s and returns the SAME pair (grace); a
 * retired token presented again < 30 s after rotation is 409 REFRESH_SUPERSEDED
 * (not revoked); presented >= 30 s after rotation it REVOKES the session; the
 * backend waits up to 5 s for the per-session lock (then 503).
 *
 * What this client does about it (per process / edge isolate):
 *   - in-flight de-dup: one backend request per refresh token;
 *   - success memo old -> new for >= 60 s (grace + margin), longer while no
 *     caller has received the pair; memo hits follow the chain T0->T1->T2, so a
 *     straggler is never handed a superseded pair and never re-presents a
 *     retired token to the backend (which would revoke after 30 s);
 *   - retries of the same token on network / 5xx / protocol failures, with
 *     short backoff and Retry-After, bounded well under the grace window: a
 *     lost response after a committed rotation is rescued by the grace pair;
 *   - a caller that stops waiting does NOT abort the request: when it
 *     completes, the memo still gets the pair for the next request;
 *   - superseded (409): NOT retried with the same token (another 409 at best,
 *     a revocation once 30 s have passed); the memo / chain is consulted
 *     first, else the caller gets a retryable `unavailable` with Retry-After
 *     and the token is negative-cached for the memo lifetime so this process
 *     never re-presents it;
 *   - negative cache: a refresh 401 costs at most one backend call per token
 *     per REJECTED_NEGATIVE_TTL_MS, an outage at most one per few seconds;
 *   - a refresh 401 UNAUTHENTICATED is definitive and clears both cookies;
 *     every other failure leaves them untouched.
 */
import {
  v1CookieNames,
  V1_REFRESH_MAX_AGE_CAP_SECONDS,
  accessCookieMaxAge,
  v1CookieOptions,
  type WritableCookieJar,
} from "./cookies"
import { readV1Session } from "./read"
import { findBackendRefreshCookie, setCookieValues } from "./set-cookie"

// ---- tunables ----------------------------------------------------------------------

/**
 * true since the backend answers the benign "superseded" case with its own
 * 409 REFRESH_SUPERSEDED (fix/refresh-superseded 32c55c7): every remaining
 * refresh 401 UNAUTHENTICATED is definitive and clears both cookies. Set to
 * false only to run against a backend without that change (a refresh 401 then
 * clears just the access cookie).
 */
export const UNAUTHENTICATED_IS_DEFINITIVE = true

/**
 * "A sibling already rotated this token": BOTH the status and the code must
 * match. A 409 without the code (or the code on another status) is a contract
 * error: not retried, cookies kept.
 */
export const SUPERSEDED_STATUS = 409
export const SUPERSEDED_PROBLEM_CODE = "REFRESH_SUPERSEDED"

/** Backend grace window (src/auth/sessions.ts REFRESH_GRACE_SECONDS). */
export const BACKEND_GRACE_MS = 30_000
/**
 * Success memo lifetime after a caller received the pair: grace + margin.
 * Trade-off: within this window ANY request presenting the old token to this
 * BFF process gets the current pair from memory instead of the backend's
 * reuse detection revoking the session — a stolen old token replayed through
 * the portal within 60 s is not detected. Stragglers re-presenting a retired
 * token after 30 s (which revokes the user's own session) are the likelier
 * case, so the memo wins.
 */
export const REFRESH_MEMO_TTL_MS = 60_000
/** Memo lifetime while no caller has received the pair (every waiter gave up). */
export const UNDELIVERED_MEMO_TTL_MS = 10 * 60_000
export const REJECTED_NEGATIVE_TTL_MS = 30_000
/**
 * A superseded token is never re-sent from this process while a re-send
 * could revoke the session (>= 30 s after its rotation): same lifetime as the
 * success memo.
 */
export const SUPERSEDED_NEGATIVE_TTL_MS = REFRESH_MEMO_TTL_MS
export const TRANSIENT_NEGATIVE_TTL_MS = 3_000
const MAX_NEGATIVE_TTL_MS = 30_000

/** Server actions / route handlers: how long a caller waits for a refresh. */
export const ACTION_WAIT_MS = 8_000
/** Middleware: shorter, a navigation must not hang on the backend. */
export const MIDDLEWARE_WAIT_MS = 2_500
/** Hard abort of one attempt (> the backend's 5 s lock wait). */
export const ATTEMPT_ABORT_MS = 15_000
/** Retries of one token stop once this much time has passed (< 30 s grace). */
export const RETRY_BUDGET_MS = 6_000
const MAX_ATTEMPTS = 3
const BACKOFF_MS = [250, 1_000]

const MAX_TRACKED = 500
const MAX_CHAIN_HOPS = 8
/** RefreshBodySchema: refreshToken max 512. */
const MAX_REFRESH_TOKEN_LENGTH = 512
/** The backend ignores shorter secrets (src/utilities/rateLimiting.ts). */
export const MIN_BFF_SECRET_LENGTH = 32

// ---- types -----------------------------------------------------------------------

export interface V1SessionSummary {
  sid: string
  realm: "staff" | "portal"
  expiresAt: string
}

/** What a successful login / verify / exchange / refresh hands the BFF. */
export interface V1Tokens {
  accessToken: string
  expiresIn: number
  refreshToken: string
  /** Backend cookie Max-Age (session remaining), when it sent one. */
  refreshMaxAgeSeconds: number | null
  session: V1SessionSummary
  /** Login / verify / exchange only (GraphQL transition token). */
  legacyToken?: string
}

export type V1FailureReason =
  | "network"
  | "timeout"
  /** Non-2xx that is not a refresh rejection. */
  | "status"
  /** 2xx whose body or Set-Cookie could not be used. */
  | "protocol"
  /** The backend said a sibling request already rotated this token. */
  | "superseded"
  /** The client is misconfigured (no backend URL): nothing was sent. */
  | "config"

/** Any failure that is NOT a refresh rejection: cookies stay untouched. */
export interface V1TransientFailure {
  kind: "error"
  reason: V1FailureReason
  /** true: try again later. */
  retryable: boolean
  status?: number
  code?: string
  retryAfterSeconds?: number
  requestId?: string
}

export type V1RefreshOutcome =
  | { kind: "refreshed"; tokens: V1Tokens }
  /** 401 UNAUTHENTICATED on refresh: definitive, the session is gone. */
  | { kind: "rejected"; status: 401; requestId?: string }
  /** Locally decided: the cookie can never be a valid token (> 512 chars). */
  | { kind: "invalid"; local: true }
  | V1TransientFailure

export interface V1RequestContext {
  /** Proxy-set end-user IP for x-client-ip (only with a valid BFF secret). */
  clientIp: string | null
  /** The end user's User-Agent, forwarded so the session row records it. */
  userAgent?: string | null
}

export interface V1Logger {
  warn(message: string, meta: Record<string, unknown>): void
  error(message: string, meta: Record<string, unknown>): void
}

export interface V1SessionClientConfig {
  /** REST base ending in /api (NEXT_PUBLIC_BACKEND_REST_API); `/v1` is appended. */
  restApiUrl: string
  /** BFF_SHARED_SECRET; BFF headers are omitted when unset or too short. */
  bffSecret?: string
  /** Production: configuration problems are logged at error level. */
  production?: boolean
  fetch?: typeof fetch
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  logger?: V1Logger
  attemptAbortMs?: number
  retryBudgetMs?: number
}

/** Only these keys ever reach a log line: no tokens, no IPs, no secret, no URL. */
const defaultLogger: V1Logger = {
  warn(message, meta) {
    console.warn(`[v1-session] ${message}`, meta)
  },
  error(message, meta) {
    console.error(`[v1-session] ${message}`, meta)
  },
}

// ---- classification ----------------------------------------------------------------

interface ProblemBody {
  code?: unknown
  requestId?: unknown
}

function discardBody(response: Response) {
  try {
    if (response.body && !response.bodyUsed) {
      response.body.cancel().catch(() => undefined)
    }
  } catch {
    // Already locked / consumed: nothing to release.
  }
}

async function readProblem(response: Response): Promise<ProblemBody | null> {
  const type = response.headers.get("content-type") || ""
  if (!/^application\/(problem\+)?json/i.test(type)) {
    discardBody(response)
    return null
  }
  try {
    const body = (await response.json()) as unknown
    return body && typeof body === "object" ? (body as ProblemBody) : null
  } catch {
    return null
  }
}

function retryAfter(response: Response): number | undefined {
  const raw = response.headers.get("retry-after")
  if (!raw || !/^\d+$/.test(raw.trim())) return undefined
  return parseInt(raw.trim(), 10)
}

/**
 * The exact rule:
 *   409 + problem code REFRESH_SUPERSEDED         -> "superseded": transient,
 *                                                    retryable by the CALLER
 *                                                    (never with this token)
 *   409 without it / REFRESH_SUPERSEDED elsewhere -> "protocol": contract
 *                                                    error, NOT retryable
 *   401 + problem+json `code: "UNAUTHENTICATED"`  -> "rejected" (definitive)
 *   401 without that body (a proxy)               -> transient, retryable
 *   429, 5xx                                      -> transient, retryable
 *   400 / 403 / 415 / other 4xx                   -> transient, NOT retryable
 *                                                    (a BFF or config bug)
 * Cookies are kept for everything except "rejected".
 */
export async function classifyFailure(
  response: Response
): Promise<{ kind: "rejected"; status: 401; requestId?: string } | V1TransientFailure> {
  const problem = await readProblem(response)
  const code = typeof problem?.code === "string" ? problem.code : undefined
  const requestId =
    (typeof problem?.requestId === "string" && problem.requestId) ||
    response.headers.get("x-request-id") ||
    undefined
  const superseded = code === SUPERSEDED_PROBLEM_CODE
  if (response.status === SUPERSEDED_STATUS && superseded) {
    return {
      kind: "error",
      reason: "superseded",
      retryable: true,
      status: response.status,
      code,
      retryAfterSeconds: retryAfter(response) ?? 1,
      requestId,
    }
  }
  if (response.status === SUPERSEDED_STATUS || superseded) {
    return { kind: "error", reason: "protocol", retryable: false, status: response.status, code, requestId }
  }
  if (response.status === 401 && code === "UNAUTHENTICATED") {
    return { kind: "rejected", status: 401, requestId }
  }
  const retryable =
    response.status === 429 || response.status >= 500 || response.status === 401
  return {
    kind: "error",
    reason: "status",
    retryable,
    status: response.status,
    code,
    retryAfterSeconds: retryAfter(response),
    requestId,
  }
}

function isSessionSummary(value: unknown): value is V1SessionSummary {
  const v = value as V1SessionSummary | null
  return (
    !!v &&
    typeof v.sid === "string" &&
    (v.realm === "staff" || v.realm === "portal") &&
    typeof v.expiresAt === "string"
  )
}

/**
 * Tokens from a 2xx login / verify / exchange / refresh response, or null
 * when the body or the refresh Set-Cookie is unusable.
 */
export async function parseTokenResponse(
  response: Response,
  nowMs: number = Date.now()
): Promise<V1Tokens | null> {
  let body: Record<string, unknown>
  try {
    body = (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
  if (
    !body ||
    typeof body.accessToken !== "string" ||
    !body.accessToken ||
    typeof body.expiresIn !== "number" ||
    !(body.expiresIn > 0) ||
    !isSessionSummary(body.session)
  ) {
    return null
  }
  const cookie = findBackendRefreshCookie(setCookieValues(response.headers), nowMs)
  if (!cookie) return null
  return {
    accessToken: body.accessToken,
    expiresIn: body.expiresIn,
    refreshToken: cookie.token,
    refreshMaxAgeSeconds: cookie.maxAgeSeconds,
    session: body.session,
    ...(typeof body.legacyToken === "string" && body.legacyToken
      ? { legacyToken: body.legacyToken }
      : {}),
  }
}

/** Discriminates postAuth's union without relying on a global `Response` identity. */
export function isTransientFailure(
  value: Response | V1TransientFailure
): value is V1TransientFailure {
  return (value as V1TransientFailure).kind === "error"
}

// ---- client ------------------------------------------------------------------------

interface MemoEntry {
  tokens: V1Tokens
  settledAtMs: number
  expiresAtMs: number
  delivered: boolean
}

interface NegativeEntry {
  outcome: V1RefreshOutcome
  expiresAtMs: number
}

export interface V1RefreshOptions {
  /** How long THIS caller waits; the request itself keeps running. */
  waitMs?: number
}

export interface V1SessionClient {
  /**
   * Rotates `refreshToken` (de-duplicated, memoised, retried — see header).
   * Never touches cookies — see ensureFreshV1Session.
   */
  refresh(
    refreshToken: string,
    ctx: V1RequestContext,
    options?: V1RefreshOptions
  ): Promise<V1RefreshOutcome>
  /**
   * POST /auth/logout with the refresh token in the body and, when given, the
   * access token as Bearer. The backend answers 204 whether or not it found
   * a session, so "logged-out" means acknowledged. Evicts the token's memo.
   */
  logout(
    refreshToken: string,
    ctx: V1RequestContext,
    accessToken?: string
  ): Promise<{ kind: "logged-out" } | V1TransientFailure>
  /**
   * Low-level POST to /api/v1<path> with the BFF headers, user-agent, JSON
   * body and the hard attempt abort. For 2c-3 (magic-link verify) / 2c-4
   * (exchange). Network failures, timeouts and a missing backend URL resolve
   * to a V1TransientFailure.
   */
  postAuth(
    path: string,
    body: unknown,
    ctx: V1RequestContext,
    extraHeaders?: Record<string, string>
  ): Promise<Response | V1TransientFailure>
  /** Configuration problems found at creation (names only, never values). */
  configProblems(): string[]
  /** Test hook: sizes of the in-flight / memo / negative maps. */
  stats(): { inflight: number; memo: number; negative: number }
}

export function createV1SessionClient(config: V1SessionClientConfig): V1SessionClient {
  const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const now = config.now ?? (() => Date.now())
  const sleep =
    config.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const logger = config.logger ?? defaultLogger
  const attemptAbortMs = config.attemptAbortMs ?? ATTEMPT_ABORT_MS
  const retryBudgetMs = config.retryBudgetMs ?? RETRY_BUDGET_MS

  const rawUrl = (config.restApiUrl || "").trim()
  const urlUsable = /^https?:\/\/[^/]/i.test(rawUrl)
  const base = `${rawUrl.replace(/\/+$/, "")}/v1`
  const rawSecret = config.bffSecret?.trim() || ""
  const secret = rawSecret.length >= MIN_BFF_SECRET_LENGTH ? rawSecret : undefined

  const problems: string[] = []
  if (!urlUsable) problems.push("NEXT_PUBLIC_BACKEND_REST_API")
  if (!secret) problems.push("BFF_SHARED_SECRET")
  let reported = false
  function reportConfigOnce() {
    if (reported) return
    reported = true
    if (!urlUsable) {
      logger.error(
        "misconfigured: NEXT_PUBLIC_BACKEND_REST_API is empty or not an http(s) URL; v1 auth calls are refused",
        {}
      )
    }
    if (!secret) {
      const log = config.production
        ? (m: string, meta: Record<string, unknown>) => logger.error(m, meta)
        : (m: string, meta: Record<string, unknown>) => logger.warn(m, meta)
      log(
        "BFF_SHARED_SECRET is missing or shorter than 32 characters; BFF headers are not sent, so the backend's per-IP auth limits are shared by every portal user",
        {}
      )
    }
  }

  const inflight = new Map<string, Promise<V1RefreshOutcome>>()
  const memo = new Map<string, MemoEntry>()
  const negative = new Map<string, NegativeEntry>()

  function bffHeaders(ctx: V1RequestContext): Record<string, string> {
    if (!secret || !ctx.clientIp) return {}
    return { "x-bff-secret": secret, "x-client-ip": ctx.clientIp }
  }

  async function postAuth(
    path: string,
    body: unknown,
    ctx: V1RequestContext,
    extraHeaders: Record<string, string> = {}
  ): Promise<Response | V1TransientFailure> {
    reportConfigOnce()
    if (!urlUsable) return { kind: "error", reason: "config", retryable: false }
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, attemptAbortMs)
    try {
      return await doFetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, application/problem+json",
          ...(ctx.userAgent ? { "user-agent": ctx.userAgent.slice(0, 512) } : {}),
          ...extraHeaders,
          ...bffHeaders(ctx),
        },
        body: JSON.stringify(body ?? {}),
        cache: "no-store",
        signal: controller.signal,
      })
    } catch (error) {
      const reason: V1FailureReason = timedOut ? "timeout" : "network"
      logger.warn(`POST ${path} failed`, {
        reason,
        errorName: (error as { name?: unknown } | null)?.name ?? null,
      })
      return { kind: "error", reason, retryable: true }
    } finally {
      clearTimeout(timer)
    }
  }

  function sweep() {
    const t = now()
    const staleMemo: string[] = []
    memo.forEach((entry, key) => {
      if (entry.expiresAtMs <= t) staleMemo.push(key)
    })
    staleMemo.forEach((key) => memo.delete(key))
    const staleNegative: string[] = []
    negative.forEach((entry, key) => {
      if (entry.expiresAtMs <= t) staleNegative.push(key)
    })
    staleNegative.forEach((key) => negative.delete(key))
    // Over the bound: drop the oldest entries (insertion order). In-flight
    // requests are never dropped, so de-dup always holds for them.
    ;[memo, negative].forEach((map: Map<string, unknown>) => {
      if (map.size <= MAX_TRACKED) return
      const excess: string[] = []
      map.forEach((_v, key) => {
        if (excess.length < map.size - MAX_TRACKED) excess.push(key)
      })
      excess.forEach((key) => map.delete(key))
    })
  }

  function liveMemo(token: string): MemoEntry | undefined {
    const entry = memo.get(token)
    return entry && entry.expiresAtMs > now() ? entry : undefined
  }

  /** The newest pair reachable from `token` (T0 -> T1 -> T2 ...), age-adjusted. */
  function memoHit(token: string): V1Tokens | undefined {
    const first = liveMemo(token)
    if (!first) return undefined
    markDelivered(first)
    let entry = first
    for (let hops = 0; hops < MAX_CHAIN_HOPS; hops++) {
      const next = liveMemo(entry.tokens.refreshToken)
      if (!next) break
      entry = next
    }
    const elapsed = Math.max(0, Math.floor((now() - entry.settledAtMs) / 1000))
    return {
      ...entry.tokens,
      expiresIn: Math.max(1, entry.tokens.expiresIn - elapsed),
      refreshMaxAgeSeconds:
        entry.tokens.refreshMaxAgeSeconds === null
          ? null
          : Math.max(1, entry.tokens.refreshMaxAgeSeconds - elapsed),
    }
  }

  function markDelivered(entry: MemoEntry) {
    if (entry.delivered) return
    entry.delivered = true
    entry.expiresAtMs = Math.min(entry.expiresAtMs, now() + REFRESH_MEMO_TTL_MS)
  }

  async function attempt(token: string, ctx: V1RequestContext): Promise<V1RefreshOutcome> {
    const response = await postAuth("/auth/refresh", { refreshToken: token }, ctx)
    if (isTransientFailure(response)) return response
    if (response.ok) {
      const tokens = await parseTokenResponse(response, now())
      if (tokens) return { kind: "refreshed", tokens }
      logger.warn("refresh answered 2xx without a usable token pair", { status: response.status })
      return { kind: "error", reason: "protocol", retryable: true, status: response.status }
    }
    const failure = await classifyFailure(response)
    logger.warn(
      failure.kind === "rejected"
        ? "refresh rejected (401)"
        : "refresh failed, session kept",
      {
        status: failure.status,
        ...(failure.kind === "error" && failure.code ? { code: failure.code } : {}),
        requestId: failure.requestId ?? null,
      }
    )
    return failure
  }

  function shouldRetry(outcome: V1RefreshOutcome): outcome is V1TransientFailure {
    return (
      outcome.kind === "error" &&
      outcome.retryable &&
      (outcome.reason === "network" ||
        outcome.reason === "timeout" ||
        outcome.reason === "status" ||
        outcome.reason === "protocol")
    )
  }

  /**
   * Retries the SAME token. Safe against the backend's rules: an uncommitted
   * failure (503 lock busy, 500 rolled back) changes nothing; a committed
   * rotation whose response was lost is answered by the grace pair once.
   */
  async function attemptWithRetries(token: string, ctx: V1RequestContext): Promise<V1RefreshOutcome> {
    const start = now()
    for (let n = 1; ; n++) {
      const outcome = await attempt(token, ctx)
      if (!shouldRetry(outcome) || n >= MAX_ATTEMPTS) return outcome
      const delay =
        outcome.retryAfterSeconds !== undefined
          ? outcome.retryAfterSeconds * 1000
          : BACKOFF_MS[Math.min(n - 1, BACKOFF_MS.length - 1)]
      if (now() - start + delay > retryBudgetMs) return outcome
      await sleep(delay)
    }
  }

  function start(token: string, ctx: V1RequestContext): Promise<V1RefreshOutcome> {
    const promise = attemptWithRetries(token, ctx)
      .then(
        (outcome) => outcome,
        (error: unknown): V1RefreshOutcome => {
          logger.warn("refresh threw unexpectedly, session kept", {
            errorName: (error as { name?: unknown } | null)?.name ?? null,
          })
          return { kind: "error", reason: "network", retryable: true }
        }
      )
      .then((outcome) => {
        inflight.delete(token)
        const t = now()
        if (outcome.kind === "refreshed") {
          memo.set(token, {
            tokens: outcome.tokens,
            settledAtMs: t,
            expiresAtMs: t + UNDELIVERED_MEMO_TTL_MS,
            delivered: false,
          })
        } else if (outcome.kind === "rejected") {
          negative.set(token, { outcome, expiresAtMs: t + REJECTED_NEGATIVE_TTL_MS })
        } else if (outcome.kind === "error" && outcome.reason === "superseded") {
          negative.set(token, { outcome, expiresAtMs: t + SUPERSEDED_NEGATIVE_TTL_MS })
        } else if (outcome.kind === "error" && outcome.reason !== "config") {
          const ttl =
            outcome.retryAfterSeconds !== undefined
              ? Math.min(MAX_NEGATIVE_TTL_MS, Math.max(1_000, outcome.retryAfterSeconds * 1000))
              : TRANSIENT_NEGATIVE_TTL_MS
          negative.set(token, { outcome, expiresAtMs: t + ttl })
        }
        return outcome
      })
    inflight.set(token, promise)
    return promise
  }

  async function refresh(
    refreshToken: string,
    ctx: V1RequestContext,
    options: V1RefreshOptions = {}
  ): Promise<V1RefreshOutcome> {
    reportConfigOnce()
    if (!urlUsable) return { kind: "error", reason: "config", retryable: false }
    if (refreshToken.length > MAX_REFRESH_TOKEN_LENGTH) {
      // Can never be accepted (backend RefreshBodySchema max 512).
      return { kind: "invalid", local: true }
    }
    sweep()
    const hit = memoHit(refreshToken)
    if (hit) return { kind: "refreshed", tokens: hit }
    const cached = negative.get(refreshToken)
    if (cached && cached.expiresAtMs > now()) return cached.outcome

    const promise = inflight.get(refreshToken) ?? start(refreshToken, ctx)
    const waitMs = options.waitMs ?? ACTION_WAIT_MS
    let timer: ReturnType<typeof setTimeout> | undefined
    const gaveUp = new Promise<"gave-up">((resolve) => {
      timer = setTimeout(() => resolve("gave-up"), waitMs)
    })
    const winner = await Promise.race([promise, gaveUp])
    if (timer !== undefined) clearTimeout(timer)
    if (winner === "gave-up") {
      // The request keeps running; its result lands in the memo.
      return { kind: "error", reason: "timeout", retryable: true }
    }
    if (winner.kind === "refreshed") {
      const entry = memo.get(refreshToken)
      if (entry) markDelivered(entry)
    }
    if (winner.kind === "error" && winner.reason === "superseded") {
      // The newer pair lives in a sibling response. If that sibling ran in
      // this process, the memo has it (possibly further down the chain).
      // Otherwise: retryable `unavailable` — the browser already holds (or is
      // about to receive) the newer cookie and its next request uses it.
      const hit = memoHit(refreshToken)
      if (hit) return { kind: "refreshed", tokens: hit }
    }
    return winner
  }

  async function logout(
    refreshToken: string,
    ctx: V1RequestContext,
    accessToken?: string
  ): Promise<{ kind: "logged-out" } | V1TransientFailure> {
    // Evict the whole chain (T0 -> T1 -> T2, in both directions) to a
    // fixpoint: no memo may hand this session's pairs out after logout.
    const dead: Record<string, true> = { [refreshToken]: true }
    for (let changed = true; changed; ) {
      changed = false
      const evict: string[] = []
      memo.forEach((entry, key) => {
        if (dead[key] || dead[entry.tokens.refreshToken]) evict.push(key)
      })
      evict.forEach((key) => {
        const entry = memo.get(key)
        memo.delete(key)
        if (entry) dead[entry.tokens.refreshToken] = true
        dead[key] = true
        changed = true
      })
    }
    Object.keys(dead).forEach((key) => negative.delete(key))

    const response = await postAuth(
      "/auth/logout",
      { refreshToken },
      ctx,
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    )
    if (isTransientFailure(response)) return response
    if (response.ok) {
      discardBody(response)
      return { kind: "logged-out" }
    }
    const failure = await classifyFailure(response)
    if (failure.kind === "rejected") return { kind: "logged-out" }
    logger.warn("logout failed", { status: failure.status, requestId: failure.requestId ?? null })
    return failure
  }

  return {
    refresh,
    logout,
    postAuth,
    configProblems: () => problems.slice(),
    stats: () => ({ inflight: inflight.size, memo: memo.size, negative: negative.size }),
  }
}

// ---- cookie writers (middleware / server actions / route handlers ONLY) ---------------

export interface V1CookieWriteOptions {
  /** Secure attribute; the bindings pass NODE_ENV === "production". */
  secure: boolean
  nowMs?: number
}

/** Stores a token pair (after login / verify / exchange / refresh). */
export function writeV1SessionCookies(
  jar: WritableCookieJar,
  tokens: V1Tokens,
  options: V1CookieWriteOptions
): void {
  const nowMs = options.nowMs ?? Date.now()
  const sessionRemaining = Math.floor((Date.parse(tokens.session.expiresAt) - nowMs) / 1000)
  const refreshMaxAge = Math.min(
    tokens.refreshMaxAgeSeconds ??
      (isNaN(sessionRemaining) ? V1_REFRESH_MAX_AGE_CAP_SECONDS : sessionRemaining),
    V1_REFRESH_MAX_AGE_CAP_SECONDS
  )
  const names = v1CookieNames(options.secure)
  jar.set(names.refresh, tokens.refreshToken, v1CookieOptions(options.secure, Math.max(1, refreshMaxAge)))
  jar.set(names.access, tokens.accessToken, v1CookieOptions(options.secure, accessCookieMaxAge(tokens.expiresIn)))
}

/** Deletes both v1 cookies (same path, so the browser actually drops them). */
export function clearV1SessionCookies(jar: WritableCookieJar, options: { secure: boolean }): void {
  const names = v1CookieNames(options.secure)
  jar.set(names.access, "", v1CookieOptions(options.secure, 0))
  jar.set(names.refresh, "", v1CookieOptions(options.secure, 0))
}

export type V1EnsureResult =
  | { kind: "ok"; accessToken: string; refreshed: boolean }
  /**
   * Not authenticated on v1 for this request. `cleared`: which cookies were
   * deleted — "none" (no session cookie at all), "all" (definitive refresh
   * 401, or a locally invalid token), "access" (only with
   * UNAUTHENTICATED_IS_DEFINITIVE = false: refresh cookie kept).
   */
  | { kind: "anonymous"; cleared: "none" | "access" | "all" }
  /** Middleware only: refresh skipped for a prefetch request. */
  | { kind: "deferred" }
  /**
   * Transient (incl. 409 superseded): cookies untouched; treat this request as
   * unauthenticated on v1 — never redirect to login for it — and retry later
   * (failure.retryAfterSeconds). For superseded, the browser's next request
   * carries the newer cookie a sibling response set.
   */
  | { kind: "unavailable"; failure: V1TransientFailure }

/**
 * Returns a usable access token, refreshing when the access cookie is gone
 * or about to expire (or when `force` is set, e.g. after a v1 401 on the
 * access token). The ONLY function that rotates tokens and writes cookies.
 *
 * Proves the jar is writable (jar.assertWritable) BEFORE the rotation request
 * is sent: from a server-component render it throws
 * V1CookiesNotWritableError and the backend is never called — otherwise the
 * backend would commit a rotation whose new token can never be stored.
 *
 * Cookies: only a definitive refresh 401 UNAUTHENTICATED (or a locally
 * invalid token) clears them — both. Everything else, including 409
 * REFRESH_SUPERSEDED, 503, timeouts and network errors, leaves them exactly
 * as they were.
 */
export async function ensureFreshV1Session(
  client: V1SessionClient,
  jar: WritableCookieJar,
  ctx: V1RequestContext,
  options: V1CookieWriteOptions & { force?: boolean; waitMs?: number }
): Promise<V1EnsureResult> {
  const nowMs = options.nowMs ?? Date.now()
  const names = v1CookieNames(options.secure)
  const read = readV1Session(jar, options.secure, nowMs)
  if (read.status === "ok" && !options.force) {
    return { kind: "ok", accessToken: read.accessToken, refreshed: false }
  }
  const refreshToken = jar.get(names.refresh)
  if (!refreshToken) return { kind: "anonymous", cleared: "none" }

  jar.assertWritable()
  const outcome = await client.refresh(refreshToken, ctx, { waitMs: options.waitMs })
  if (outcome.kind === "refreshed") {
    writeV1SessionCookies(jar, outcome.tokens, options)
    return { kind: "ok", accessToken: outcome.tokens.accessToken, refreshed: true }
  }
  if (outcome.kind === "invalid" || (outcome.kind === "rejected" && UNAUTHENTICATED_IS_DEFINITIVE)) {
    clearV1SessionCookies(jar, options)
    return { kind: "anonymous", cleared: "all" }
  }
  if (outcome.kind === "rejected") {
    if (!jar.get(names.access)) return { kind: "anonymous", cleared: "none" }
    jar.set(names.access, "", v1CookieOptions(options.secure, 0))
    return { kind: "anonymous", cleared: "access" }
  }
  return { kind: "unavailable", failure: outcome }
}

/**
 * Explicit logout: asks the backend to revoke, and ALWAYS clears the local v1
 * cookies (the user asked to leave). `acknowledged: true` = the backend
 * answered 204 (it does so even when it found nothing to revoke); `false` =
 * unreachable / failed, so the backend session may outlive the local logout.
 * `waitMs`: stop waiting for the backend after this long (the request keeps
 * running; the result is then not acknowledged, reason "timeout").
 */
export async function logoutV1Session(
  client: V1SessionClient,
  jar: WritableCookieJar,
  ctx: V1RequestContext,
  options: { secure: boolean; waitMs?: number }
): Promise<{ acknowledged: boolean; failure?: V1TransientFailure }> {
  jar.assertWritable()
  const names = v1CookieNames(options.secure)
  const refreshToken = jar.get(names.refresh)
  const accessToken = jar.get(names.access)
  let result: { acknowledged: boolean; failure?: V1TransientFailure } = { acknowledged: true }
  if (refreshToken) {
    const pending = client.logout(refreshToken, ctx, accessToken)
    let timer: ReturnType<typeof setTimeout> | undefined
    const outcome =
      options.waitMs === undefined
        ? await pending
        : await Promise.race([
            pending,
            new Promise<V1TransientFailure>((resolve) => {
              timer = setTimeout(
                () => resolve({ kind: "error", reason: "timeout", retryable: true }),
                options.waitMs
              )
            }),
          ]).finally(() => timer && clearTimeout(timer))
    if (outcome.kind !== "logged-out") result = { acknowledged: false, failure: outcome }
  }
  clearV1SessionCookies(jar, options)
  return result
}
