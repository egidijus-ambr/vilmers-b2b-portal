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

/** A v1 call that did not answer 2xx (status 0 = no HTTP answer at all). */
export class V1ProblemError extends Error {
  readonly status: number
  /** Stable problem `code` (UNAUTHENTICATED, NOT_FOUND, ...), when sent. */
  readonly code: string | null
  readonly detail: string | null
  readonly requestId: string | null
  /** Whether the failed request carried X-Acting-Customer-Id. */
  readonly actingSent: boolean

  constructor(init: {
    status: number
    code?: string | null
    detail?: string | null
    requestId?: string | null
    actingSent?: boolean
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
  return new V1ProblemError({
    status: response.status,
    code: str(body?.code),
    detail: str(body?.detail),
    requestId: str(body?.requestId) ?? response.headers.get("x-request-id"),
    actingSent,
  })
}

/** GET a v1 JSON endpoint; throws V1ProblemError on any failure. */
export async function v1DataGet<T>(
  deps: V1DataClientDeps,
  req: V1DataRequest
): Promise<T> {
  const doFetch = deps.fetch ?? globalThis.fetch
  const bff = await (deps.bffHeaders ?? defaultBffHeaders)()
  const acting =
    typeof req.actingCustomerId === "number" &&
    Number.isInteger(req.actingCustomerId) &&
    req.actingCustomerId > 0
      ? req.actingCustomerId
      : null

  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-client": "portal",
    ...bff,
  }
  if (req.bearer) headers.Authorization = `Bearer ${req.bearer}`
  if (acting !== null) headers[ACTING_CUSTOMER_HEADER] = String(acting)

  const url = `${v1Base(deps.restApiUrl)}${req.path}${buildV1QueryString(
    req.query
  )}`

  let response: Response
  try {
    response = await doFetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
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
  try {
    return (await response.json()) as T
  } catch {
    throw new V1ProblemError({
      status: response.status,
      actingSent: acting !== null,
      message: "v1 request failed: invalid JSON body",
    })
  }
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
