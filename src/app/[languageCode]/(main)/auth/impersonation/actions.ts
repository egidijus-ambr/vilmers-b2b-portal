"use server"

import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { sdk } from "@lib/config"
import {
  consumeReturnToCookie,
  getCacheTag,
  removeCartId,
  setAuthToken,
  setCacheId,
} from "@lib/data/cookies"
import { getShopSettings } from "@lib/data/shop-settings"
import { listMenuCategories } from "@lib/data/categories"
import { normalizeLanguage } from "@lib/i18n/config"
import { getFirstCategoryUrl } from "@lib/util/first-category-href"
import { ACTING_CUSTOMER_COOKIE } from "@lib/util/acting-customer-cookie"
import { SHOW_ALL_PRODUCTS_COOKIE } from "@lib/util/show-all-products-cookie"
import { v1SessionClient } from "@lib/v1-session/instance"
import {
  exchangeV1Impersonation,
  isHandoffCodeShape,
} from "@lib/v1-session/impersonation"
import {
  logoutV1SessionInAction,
  storeV1TokensInAction,
  v1RequestContextInAction,
} from "@lib/v1-session/server"

export type ImpersonationState =
  | null
  /** Unknown, used, expired or rejected code: start again from the admin. */
  | { status: "expired" }
  /** The backend could not be reached / rate limited: the code may still work. */
  | { status: "unavailable" }
  /** Anything else: start again from the admin. */
  | { status: "error" }

/**
 * Stage 2c-4: redeem the admin's handoff code (read from the URL fragment by
 * the client) for an impersonation session, server-side.
 *
 * Order matters:
 *   1. shape check, then POST /auth/impersonation/exchange via the BFF
 *      (x-bff-secret + x-client-ip, so the backend's IP binding matches);
 *   2. on any failure nothing is touched: the browser keeps whatever
 *      session it had;
 *   3. on success: end the previous v1 session of this browser (this session
 *      only, D5; it reads the OLD refresh cookie, so it runs before the
 *      store), clear the previous login's acting-customer, "show all
 *      products", cart and return-to cookies, then store the v1 pair and the
 *      legacy `_furni_jwt` from the same exchange answer, drop the caches and
 *      redirect to a target computed here (never from the request).
 *
 * Never logs the code or a token.
 */
export async function exchangeImpersonationAction(
  _currentState: ImpersonationState,
  formData: FormData
): Promise<ImpersonationState> {
  const code = formData.get("code")
  const languageCode = normalizeLanguage(
    formData.get("languageCode") as string | null
  )
  if (!isHandoffCodeShape(code)) {
    return { status: "expired" }
  }

  const outcome = await exchangeV1Impersonation(
    v1SessionClient(),
    code,
    await v1RequestContextInAction()
  )
  if (outcome.kind !== "ok") {
    return { status: outcome.kind }
  }

  try {
    await logoutV1SessionInAction()
  } catch (error) {
    console.warn(
      "[impersonation] logout of the previous v1 session failed:",
      error instanceof Error ? error.name : "Unknown error"
    )
  }

  const store = await cookies()
  const secure = process.env.NODE_ENV === "production"
  for (const name of [ACTING_CUSTOMER_COOKIE, SHOW_ALL_PRODUCTS_COOKIE]) {
    store.set(name, "", { path: "/", maxAge: 0, sameSite: "lax", secure })
  }
  await removeCartId()
  // Clears it; a return-to left by the previous login is never honoured.
  await consumeReturnToCookie()

  await storeV1TokensInAction(outcome.tokens)
  await setAuthToken(outcome.tokens.legacyToken)

  const newCacheId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  await setCacheId(newCacheId)
  revalidateTag("customers")
  const customerCacheTag = await getCacheTag("customers")
  if (customerCacheTag) revalidateTag(customerCacheTag)
  const cartCacheTag = await getCacheTag("carts")
  if (cartCacheTag) revalidateTag(cartCacheTag)
  sdk.clearCache()

  // Land on the first Store category; any failure degrades to /account.
  // redirect() throws, so it stays outside the try.
  let target = `/${languageCode}/account`
  try {
    const [shopSettings, categories] = await Promise.all([
      getShopSettings(),
      listMenuCategories(languageCode),
    ])
    const url = getFirstCategoryUrl(
      shopSettings?.navigation_items,
      categories,
      languageCode
    )
    if (url.startsWith(`/${languageCode}/`) && !url.startsWith("//")) {
      target = url
    }
  } catch (error) {
    console.warn(
      "[impersonation] could not resolve the landing category:",
      error instanceof Error ? error.name : "Unknown error"
    )
  }

  redirect(target)
}
