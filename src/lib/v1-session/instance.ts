import "server-only"

/**
 * The process-wide v1 session client (one per module instance, so refresh
 * de-dup and the memo span every request this process or edge isolate
 * serves). Configuration reuses existing env names: NEXT_PUBLIC_BACKEND_REST_API
 * (the REST base the SDK uses) and BFF_SHARED_SECRET (as the GraphQL client
 * uses). No feature flag. A missing / unusable value is logged once (error
 * level in production for the secret, always for the URL; never the value)
 * and a missing URL makes every call fail fast with reason "config".
 */
import { createV1SessionClient, type V1SessionClient } from "./refresh"

export { v1CookiesSecure } from "./cookies"

let singleton: V1SessionClient | null = null

export function v1SessionClient(): V1SessionClient {
  if (!singleton) {
    singleton = createV1SessionClient({
      restApiUrl: process.env.NEXT_PUBLIC_BACKEND_REST_API || "",
      bffSecret: process.env.BFF_SHARED_SECRET,
      production: process.env.NODE_ENV === "production",
    })
  }
  return singleton
}

/** Test hook: drop the singleton so the next call re-reads the env. */
export function resetV1SessionClientForTests(): void {
  singleton = null
}

