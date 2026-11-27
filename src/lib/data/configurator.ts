"use server"

import { sdk } from "@lib/config"
import { unstable_noStore } from "next/cache"
import { getActingCustomer } from "@lib/data/acting-customer"
import { getDefaultPriceListId } from "@lib/data/default-pricelist"
import { getPrimaryPriceListId } from "@configurator/lib/pricelist"
import { applyPaletteColors } from "@configurator/lib/apply-palette-colors"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { v1ConfiguratorData } from "./catalog-v1"
import { describeV1Error, v1GetAuthSession } from "./me-v1"
import { getV1RequestContext } from "./v1-transport"
import { selectConfiguratorTransport } from "./v1-transport-rule"

export type ConfiguratorDataResult = {
  data: any
  /** The price list the data was fetched for; derived server-side. */
  priceListId: number
  /**
   * v1 only: the REAL caller's configurator flag (never the acting
   * target's; true for a guest). Informational, not enforced. Undefined on
   * the GraphQL path (customer.is_configurator_enabled carries it there).
   */
  configuratorEnabled?: boolean
}

/**
 * Configurator data, server-side (never in the browser).
 *
 * v1 (GET /catalog/products/:id/configurator; ./v1-transport-rule.ts):
 * the server applies the listing visibility rule (a product the caller may
 * not see is 404) and chooses the price list (`priceListId`) and the
 * palettes (`paletteIds`). Nothing price- or palette-related is sent: the
 * client's `paletteIds` argument is ignored on this path and the server's
 * list is used for applyPaletteColors. `data` keeps the GraphQL shape.
 *
 * GraphQL (unchanged): legacy-only sessions, a v1 401, and - the one extra
 * condition, selectConfiguratorTransport - a login with prices disabled
 * (`features.prices === false`): v1 would serve it null amounts that the
 * configurator and add-to-cart cannot price. There the price list is the
 * acting customer's primary list or the shop default and `paletteIds`
 * comes from the client, exactly as before.
 *
 * A login whose configurator is disabled (Customer.is_configurator_enabled
 * = false) is served like everyone else, on both paths, as before v1: the
 * backend no longer refuses it (it reports the flag as `configuratorEnabled`
 * instead), and the portal only hides its "place an order" card for it
 * (account overview, customer.is_configurator_enabled from GET /me
 * `features`). `configuratorEnabled` is passed through for callers that
 * want it; nothing gates on it here.
 *
 * Failures (404, 429, 5xx, network) return null: the hook shows
 * "configurator-data-load-error" (fail closed).
 */
export async function getConfiguratorDataAction(
  productContainerId: number,
  language?: string,
  paletteIds?: number[]
): Promise<ConfiguratorDataResult | null> {
  unstable_noStore()
  const ctx = await getV1RequestContext()
  if (ctx.transport === "graphql") {
    return getConfiguratorDataGraphql(productContainerId, language, paletteIds)
  }

  let pricesFeature: boolean | null = null
  if (ctx.bearer) {
    try {
      const session = await v1GetAuthSession(ctx.bearer)
      pricesFeature = session.features?.prices ?? null
    } catch (error) {
      if (isV1ProblemError(error) && error.status === 401) {
        console.warn("[configurator] auth/session 401, using the GraphQL path")
        return getConfiguratorDataGraphql(productContainerId, language, paletteIds)
      }
      console.error("[configurator] auth/session failed:", describeV1Error(error))
      return null
    }
  }
  if (selectConfiguratorTransport(ctx.transport, pricesFeature) === "graphql") {
    return getConfiguratorDataGraphql(productContainerId, language, paletteIds)
  }

  try {
    const body = await v1ConfiguratorData(ctx.bearer, {
      productContainerId,
      language: language ?? "en",
    })
    if (body.priceListId == null) {
      // Only a login without prices gets null; the session said otherwise
      // (changed meanwhile): the unchanged GraphQL path can still price it.
      console.warn("[configurator] v1 priceListId null, using the GraphQL path")
      return getConfiguratorDataGraphql(productContainerId, language, paletteIds)
    }
    const data = applyPaletteColors(body.data ?? null, body.paletteIds ?? [])
    if (!data) return null
    return {
      data,
      priceListId: body.priceListId,
      configuratorEnabled: body.configuratorEnabled,
    }
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401) {
      console.warn("[configurator] 401, using the GraphQL path")
      return getConfiguratorDataGraphql(productContainerId, language, paletteIds)
    }
    console.error(
      `[configurator] product ${productContainerId} failed:`,
      describeV1Error(error)
    )
    return null
  }
}

/**
 * GraphQL path (legacy sessions / v1 401 / prices disabled; see
 * v1-transport-rule.ts). A failure to resolve the acting customer
 * propagates (the hook shows an error) rather than silently falling back to
 * the default list, which would show a real customer the wrong prices.
 */
async function getConfiguratorDataGraphql(
  productContainerId: number,
  language?: string,
  paletteIds?: number[]
): Promise<ConfiguratorDataResult | null> {
  const actingCustomer = await getActingCustomer()
  const priceListId =
    getPrimaryPriceListId(actingCustomer) ?? (await getDefaultPriceListId())
  const data = await sdk.products.getConfiguratorData(
    productContainerId,
    priceListId,
    language,
    paletteIds
  )
  if (!data) return null
  return { data, priceListId }
}
