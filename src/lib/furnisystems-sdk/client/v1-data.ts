import "server-only"

/**
 * Server-only transport for AUTHENTICATED (or session-aware) REST v1 data
 * reads (portal REST migration slice 1: catalogue listings).
 *
 * Differences from ./catalog-v1.ts v1GetJson (anonymous, cacheable reads):
 *   - optional `Authorization: Bearer <v1 access token>` (never the legacy
 *     `_furni_jwt`: v1 answers 401 to it);
 *   - optional `X-Acting-Customer-Id`;
 *   - `x-client: portal` + the trusted-BFF headers on every call, so the v1
 *     per-IP limiter keys on the end user and not this server;
 *   - always `cache: "no-store"`: an answer may be customer-specific, so it
 *     must never land in Next's shared data cache;
 *   - non-2xx answers (RFC 9457 problem+json, or whatever a proxy sends)
 *     become a typed V1ProblemError instead of a message string.
 *
 * Pure apart from fetch + getBffHeadersIfAvailable; the request context
 * (which token, which acting id) is decided by the caller
 * (src/lib/data/catalog-v1.ts).
 */
// No static import of ./index (Apollo, path aliases) or ./catalog-v1 (which
// imports ./index): this module stays loadable by the verify scripts.

/** Same rule as ./catalog-v1 v1BaseUrl: the REST base (ends in /api) + /v1. */
function v1Base(restApiUrl: string): string {
  return `${restApiUrl.replace(/\/+$/, "")}/v1`
}

async function defaultBffHeaders(): Promise<Record<string, string>> {
  const { getBffHeadersIfAvailable } = await import("./index")
  return getBffHeadersIfAvailable()
}

export const ACTING_CUSTOMER_HEADER = "X-Acting-Customer-Id"

/** One field error of a 400 VALIDATION_FAILED answer (`path` e.g. `body.email`). */
export interface V1FieldError {
  path: string
  message: string
}

/** A v1 call that did not answer 2xx (status 0 = no HTTP answer at all). */
export class V1ProblemError extends Error {
  readonly status: number
  /** Stable problem `code` (UNAUTHENTICATED, NOT_FOUND, ...), when sent. */
  readonly code: string | null
  readonly detail: string | null
  readonly requestId: string | null
  /** Whether the failed request carried X-Acting-Customer-Id. */
  readonly actingSent: boolean
  /** Field errors (400 VALIDATION_FAILED only); [] otherwise. */
  readonly errors: V1FieldError[]
  /** Retry-After in seconds (429), when sent as a number. */
  readonly retryAfter: number | null

  constructor(init: {
    status: number
    code?: string | null
    detail?: string | null
    requestId?: string | null
    actingSent?: boolean
    errors?: V1FieldError[] | null
    retryAfter?: number | null
    message?: string
  }) {
    super(
      init.message ??
        `v1 request failed: ${init.status}${init.code ? ` ${init.code}` : ""}`
    )
    this.name = "V1ProblemError"
    this.status = init.status
    this.code = init.code ?? null
    this.detail = init.detail ?? null
    this.requestId = init.requestId ?? null
    this.actingSent = init.actingSent ?? false
    this.errors = init.errors ?? []
    this.retryAfter = init.retryAfter ?? null
  }
}

export function isV1ProblemError(e: unknown): e is V1ProblemError {
  return (
    e instanceof V1ProblemError ||
    (e as { name?: unknown } | null)?.name === "V1ProblemError"
  )
}

export type V1Query = Record<
  string,
  string | number | boolean | number[] | null | undefined
>

/**
 * `?a=1&b=2`: undefined / null / "" / [] / false are omitted, `true` is
 * sent as "1", number arrays comma-joined.
 */
export function buildV1QueryString(query: V1Query | undefined): string {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === false) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      params.set(key, value.join(","))
    } else if (value === true) {
      params.set(key, "1")
    } else {
      const s = String(value)
      if (s === "") continue
      params.set(key, s)
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export interface V1DataRequest {
  /** Path below /api/v1, already URL-encoded per segment, e.g. `/catalog/...`. */
  path: string
  query?: V1Query
  /**
   * POST only: a JSON body (sent with Content-Type: application/json).
   * Omitted = no body and no Content-Type (the bodyless v1 POST routes).
   */
  body?: Record<string, unknown>
  /** v1 access token; omitted for a guest (no Authorization header at all). */
  bearer?: string | null
  /** Sent as X-Acting-Customer-Id when a positive integer. */
  actingCustomerId?: number | null
}

export interface V1DataClientDeps {
  restApiUrl: string
  fetch?: typeof fetch
  /** Defaults to getBffHeadersIfAvailable (request headers; {} outside a request). */
  bffHeaders?: () => Promise<Record<string, string>>
}

/** Parses a problem+json body defensively (a 502 from nginx is HTML). */
async function problemFrom(
  response: Response,
  actingSent: boolean
): Promise<V1ProblemError> {
  let body: Record<string, unknown> | null = null
  try {
    const text = await response.text()
    const parsed = text ? JSON.parse(text) : null
    body = parsed && typeof parsed === "object" ? parsed : null
  } catch {
    body = null
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null)
  const errors: V1FieldError[] = Array.isArray(body?.errors)
    ? (body!.errors as unknown[])
        .filter(
          (e): e is V1FieldError =>
            !!e &&
            typeof (e as V1FieldError).path === "string" &&
            typeof (e as V1FieldError).message === "string"
        )
        .map((e) => ({ path: e.path, message: e.message }))
    : []
  const retryAfterRaw = response.headers.get("retry-after")
  const retryAfter =
    retryAfterRaw && /^\d+$/.test(retryAfterRaw.trim())
      ? Number(retryAfterRaw.trim())
      : null
  return new V1ProblemError({
    status: response.status,
    code: str(body?.code),
    detail: str(body?.detail),
    requestId: str(body?.requestId) ?? response.headers.get("x-request-id"),
    actingSent,
    errors,
    retryAfter,
  })
}

function actingIdOf(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null
}

async function requestHeaders(
  deps: V1DataClientDeps,
  req: V1DataRequest,
  accept: string
): Promise<{ headers: Record<string, string>; acting: number | null }> {
  const bff = await (deps.bffHeaders ?? defaultBffHeaders)()
  const acting = actingIdOf(req.actingCustomerId)
  const headers: Record<string, string> = {
    Accept: accept,
    "x-client": "portal",
    ...bff,
  }
  if (req.bearer) headers.Authorization = `Bearer ${req.bearer}`
  if (acting !== null) headers[ACTING_CUSTOMER_HEADER] = String(acting)
  return { headers, acting }
}

/**
 * One v1 request; resolves the 2xx Response (body unread), throws
 * V1ProblemError for every non-2xx answer and for network failures.
 */
async function v1Send(
  deps: V1DataClientDeps,
  req: V1DataRequest,
  method: "GET" | "POST",
  accept: string
): Promise<Response> {
  const doFetch = deps.fetch ?? globalThis.fetch
  const { headers, acting } = await requestHeaders(deps, req, accept)
  const url = `${v1Base(deps.restApiUrl)}${req.path}${buildV1QueryString(
    req.query
  )}`

  // A JSON body only when the caller passes one (public forms); the other
  // v1 POST routes used here declare none (no Content-Type, so no 415).
  const hasBody = method === "POST" && req.body !== undefined
  if (hasBody) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await doFetch(url, {
      method,
      headers,
      cache: "no-store",
      ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
    })
  } catch (error) {
    throw new V1ProblemError({
      status: 0,
      actingSent: acting !== null,
      message: `v1 request failed: ${
        error instanceof Error ? error.message : "network error"
      }`,
    })
  }
  if (!response.ok) throw await problemFrom(response, acting !== null)
  return response
}

async function jsonOf<T>(response: Response, actingSent: boolean): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new V1ProblemError({
      status: response.status,
      actingSent,
      message: "v1 request failed: invalid JSON body",
    })
  }
}

/** GET a v1 JSON endpoint; throws V1ProblemError on any failure. */
export async function v1DataGet<T>(
  deps: V1DataClientDeps,
  req: V1DataRequest
): Promise<T> {
  const response = await v1Send(deps, req, "GET", "application/json")
  return jsonOf<T>(response, actingIdOf(req.actingCustomerId) !== null)
}

/**
 * POST to a v1 JSON endpoint (`req.body` as JSON when given, else no body);
 * throws V1ProblemError.
 */
export async function v1DataPost<T>(
  deps: V1DataClientDeps,
  req: V1DataRequest
): Promise<T> {
  const response = await v1Send(deps, req, "POST", "application/json")
  return jsonOf<T>(response, actingIdOf(req.actingCustomerId) !== null)
}

/**
 * GET a v1 binary endpoint (PDF, document download). Resolves the 2xx
 * Response with its body UNREAD, so the caller can stream it; throws
 * V1ProblemError otherwise (problem+json bodies are parsed for the code).
 */
export async function v1DataGetBinary(
  deps: V1DataClientDeps,
  req: V1DataRequest,
  accept = "*/*"
): Promise<Response> {
  return v1Send(deps, req, "GET", `${accept}, application/problem+json`)
}

/**
 * Runs `call(actingId)`; when it fails with 403 / 404 while the acting
 * header was sent, retries ONCE without it (today's GraphQL behaviour for a
 * stale or no-longer-allowed acting customer is "fall back to the agent's
 * own view"). `onStaleActing` runs only for a 404 whose retry succeeded:
 * that 404 was about the acting customer, not about the resource (e.g. a
 * content block also 404s when it does not exist), so only then is the
 * acting cookie really stale.
 */
export async function withActingRetry<T>(
  actingCustomerId: number | null,
  call: (actingCustomerId: number | null) => Promise<T>,
  onStaleActing: () => Promise<void> | void
): Promise<T> {
  if (actingCustomerId === null) return call(null)
  try {
    return await call(actingCustomerId)
  } catch (error) {
    if (
      !isV1ProblemError(error) ||
      !error.actingSent ||
      (error.status !== 403 && error.status !== 404)
    ) {
      throw error
    }
    const result = await call(null)
    if (error.status === 404) {
      try {
        await onStaleActing()
      } catch {
        // Best effort (e.g. cookies are read-only in a render).
      }
    }
    return result
  }
}

/**
 * `onStaleActing` for resources the acting header NARROWS (an order, its
 * invoice, a company file: D4). There a 404 with the header followed by a
 * 200 without it only says "this resource is outside the acting customer's
 * scope" (e.g. an agent acting for X opens an order of managed customer Y
 * from an old tab), not that the acting id is stale. So the cookie is only
 * dropped when `lookupActing` (GET /me with the header) also answers 404;
 * any other answer, or an error, keeps it.
 */
export function dropActingIfConfirmedStale(
  lookupActing: () => Promise<unknown>,
  drop: () => Promise<void> | void
): () => Promise<void> {
  return async () => {
    try {
      await lookupActing()
    } catch (error) {
      if (isV1ProblemError(error) && error.status === 404) await drop()
    }
  }
}

/**
 * For resources the acting header NARROWS by visibility (the product page,
 * the configurator): a 404 with the header usually means "the acting
 * customer may not see this product", which must stay a 404 (GraphQL
 * filtered by the acting customer's tags / price lists too), NOT silently
 * become the agent's own view.
 *
 * The ONLY answer the backend gives for a stale / invalid acting customer
 * is 404 `NOT_FOUND` (furnisystems-backend src/auth/scopes.ts
 * resolveActingCustomer: unknown, soft-deleted, non-B2B or unmanaged
 * target; rendered by src/api/v1/serviceErrors.ts toProblem). A refused
 * acting header (sub-account login, impersonated session, a role that may
 * not act) is 403 `FORBIDDEN`, the SAME code as every other 403 (policy
 * denial, staff realm on the catalogue), so no 403 can be told apart as
 * "acting refused" and none is retried: retrying would re-serve the request
 * in the agent's own scope (its palettes, its price list). So:
 *   404 NOT_FOUND with the header -> `isActingStale()` (GET /me with the
 *                                    header): only when the acting customer
 *                                    itself is gone (true) is the cookie
 *                                    dropped and the call retried without
 *                                    the header; otherwise the 404 stands;
 *   anything else (403 included)  -> thrown unchanged.
 */
/**
 * The one problem a stale acting customer produces: 404 with code
 * NOT_FOUND. A 404 without a code (a proxy, not the v1 app) is not one.
 */
function isStaleActingCandidate(error: V1ProblemError): boolean {
  return error.status === 404 && error.code === "NOT_FOUND"
}

export async function withActingRetryIfStale<T>(
  actingCustomerId: number | null,
  call: (actingCustomerId: number | null) => Promise<T>,
  isActingStale: () => Promise<boolean>,
  dropActing: () => Promise<void> | void
): Promise<T> {
  if (actingCustomerId === null) return call(null)
  try {
    return await call(actingCustomerId)
  } catch (error) {
    if (!isV1ProblemError(error) || !error.actingSent) throw error
    if (!isStaleActingCandidate(error)) throw error
    let stale = false
    try {
      stale = await isActingStale()
    } catch {
      stale = false
    }
    if (!stale) throw error
    try {
      await dropActing()
    } catch {
      // Best effort (cookies are read-only in a render).
    }
    return call(null)
  }
}
