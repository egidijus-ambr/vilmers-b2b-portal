import "server-only"

/**
 * Request-scoped decision v1 vs GraphQL for the catalogue listings. The rule
 * itself (and when to delete all of this) is in ./catalog-transport-rule.ts.
 */
import { cache } from "react"
import { cookies } from "next/headers"
import { getV1SessionForRender } from "@lib/v1-session/render"
import {
  selectCatalogTransport,
  type CatalogTransport,
} from "./catalog-transport-rule"

export type { CatalogTransport }

export interface CatalogRequestContext {
  transport: CatalogTransport
  /** v1 access token, only when transport is v1 and the user is logged in. */
  bearer: string | null
  /** A `_furni_jwt` cookie is present (decides the 401 fallback). */
  hasLegacyJwt: boolean
}

export const getCatalogRequestContext = cache(
  async (): Promise<CatalogRequestContext> => {
    const [v1, store] = await Promise.all([getV1SessionForRender(), cookies()])
    const hasLegacyJwt = Boolean(store.get("_furni_jwt")?.value)
    const transport = selectCatalogTransport(v1.status, hasLegacyJwt)
    return {
      transport,
      bearer: transport === "v1" && v1.status === "ok" ? v1.accessToken : null,
      hasLegacyJwt,
    }
  }
)
