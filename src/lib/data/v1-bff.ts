import "server-only"

/**
 * Shared pieces of the BFF proxy route handlers on REST v1 (portal REST
 * slice 6 / 2c-6): src/app/api/{orders/[id]/invoice,customer-files/[id],
 * tawk-hash}/route.ts. The bearer comes from getV1RequestContext() (refresh
 * on demand; /api is outside the middleware matcher).
 *
 * What the browser gets for a v1 failure (bodies are the same small JSON the
 * legacy handlers returned; never an upstream body, never a token):
 *   400 (id the backend rejects) / 404   -> 404 `notFound`
 *   401 (after the GraphQL/legacy retry) -> 401 Unauthorized
 *   403                                  -> 403 Forbidden
 *   429                                  -> 429 (Retry-After passed on)
 *   503                                  -> 503 (chat / storage not available)
 *   anything else, network, timeout      -> 502 `failed`
 */
import { NextResponse } from "next/server"
import {
  isV1ProblemError,
  v1DataGetBinary,
  v1DataPost,
  withActingRetry,
} from "@lib/furnisystems-sdk/client/v1-data"
import { describeV1Error } from "./me-v1"
import { actingCustomerIdForV1, dropActingCookieIfStale } from "./v1-acting"

const restApiUrl = () => process.env.NEXT_PUBLIC_BACKEND_REST_API || ""

export const PRIVATE_NO_STORE = "private, no-cache, no-store, must-revalidate"

export function jsonError(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "private, no-store", ...(headers ?? {}) } }
  )
}

export function v1ProblemResponse(
  label: string,
  error: unknown,
  messages: { notFound: string; failed: string }
): NextResponse {
  const status = isV1ProblemError(error) ? error.status : 0
  if (status === 400 || status === 404) return jsonError(404, messages.notFound)
  if (status === 401) return jsonError(401, "Unauthorized")
  if (status === 403) return jsonError(403, "Forbidden")
  if (status === 429) return jsonError(429, "Too many requests")
  if (status === 503) return jsonError(503, "Service unavailable")
  console.error(`[${label}] v1 upstream failed:`, describeV1Error(error))
  return jsonError(502, messages.failed)
}

/** `filename="..."` from a Content-Disposition, reduced to a safe charset. */
export function safeFilename(disposition: string | null, fallback: string): string {
  const raw = disposition?.match(/filename="([^"]+)"/)?.[1] ?? disposition?.match(/filename=([^;]+)/)?.[1]
  const cleaned = (raw ?? "").trim().replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 200)
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : fallback
}

/**
 * A v1 binary GET for the customer in scope: X-Acting-Customer-Id for an
 * agent / admin with a selected customer (v1-acting.ts), retried once
 * without it on a 403 / 404 (the agent's own scope, which on the backend
 * still includes its managed customers' orders). Throws V1ProblemError.
 */
export async function v1ScopedBinary(
  bearer: string,
  path: string,
  accept: string
): Promise<Response> {
  const acting = await actingCustomerIdForV1()
  return withActingRetry(
    acting,
    (actingCustomerId) =>
      v1DataGetBinary({ restApiUrl: restApiUrl() }, { path, bearer, actingCustomerId }, accept),
    // A 404 here may only mean "outside the acting customer's scope" (D4):
    // the cookie is dropped only when /me with the header confirms it.
    dropActingCookieIfStale(bearer, acting)
  )
}

/** POST with no body as the caller itself (no acting header). */
export function v1SelfPost<T>(bearer: string, path: string): Promise<T> {
  return v1DataPost<T>({ restApiUrl: restApiUrl() }, { path, bearer })
}
