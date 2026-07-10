"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import {
  CartOfferData,
  OfferItemOverride,
  OfferPdfResult,
} from "@lib/furnisystems-sdk/modules/offer-pdf/types"
import { features } from "@lib/features"

/**
 * Map the UI route `languageCode` to the backend `Language` enum member.
 *
 * The backend `Language` enum's canonical codes are `en`, `de`, `fr`, `lt` and
 * `dk` (Danish is `dk`). The UI route codes en/de/fr/lt match those enum members
 * 1:1 and pass through unchanged, but the Danish route code is `da`, which must
 * be remapped to `dk`. (The enum also still carries a legacy `da` alias, but
 * Danish content on the backend is keyed on `dk`, so we normalize to it.)
 *
 * Today middleware only exposes en/fr/de, so `da` is not yet reachable — this
 * mapping exists so enabling Danish later does not silently break the offer PDF.
 */
const LANGUAGE_TO_BACKEND: Record<string, string> = { da: "dk" }

/**
 * Render a cart/offer PDF on the backend and return the base64-encoded document
 * for in-browser preview. Mirrors the session/auth pattern used by the cart
 * server actions: the backend re-authorizes access by cart owner, and the SDK
 * attaches the `_furni_jwt` cookie when called from this "use server" action.
 */
export const renderCartOffer = async (
  cartId: number,
  language: string,
  overrides?: OfferItemOverride[]
): Promise<OfferPdfResult | null> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return null

    const backendLanguage = LANGUAGE_TO_BACKEND[language] ?? language

    return await sdk.offerPdf.render(cartId, {
      language: backendLanguage,
      showPvm: features.showPvm,
      showVolume: features.showVolume,
      vatRate: 0.21,
      persist: false,
      overrides,
    })
  } catch (error) {
    console.error("[renderCartOffer] Error rendering offer PDF:", error)
    return null
  }
}

/**
 * Fetch the structured offer data (context + items) used by the HTML offer
 * template. Same session/auth pattern as the cart server actions and the same
 * `da → dk` language normalization as `renderCartOffer`.
 */
export const getCartOffer = async (
  cartId: number,
  language: string
): Promise<CartOfferData | null> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return null

    const backendLanguage = LANGUAGE_TO_BACKEND[language] ?? language

    return await sdk.offerPdf.getCartOfferData(cartId, {
      language: backendLanguage,
      showPvm: features.showPvm,
      showVolume: features.showVolume,
      vatRate: 0.21,
    })
  } catch (error) {
    console.error("[getCartOffer] Error fetching offer data:", error)
    return null
  }
}

/**
 * Email a client-generated offer PDF (base64) to the customer (or an explicit
 * recipient). Same session/auth gate as the other offer actions. Returns the
 * backend boolean, or null on an invalid session / error.
 */
export const sendCartOfferEmail = async (
  cartId: number,
  pdfBase64: string,
  recipientEmail?: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: "session" }

    const sent = await sdk.offerPdf.emailCartOffer(cartId, pdfBase64, {
      fileName: `cart-offer-${cartId}.pdf`,
      recipientEmail,
    })
    // Backend returned false without throwing -> generic failure.
    return sent ? { ok: true } : { ok: false, error: "send-failed" }
  } catch (error: any) {
    // Backend throws clear messages (e.g. "No recipient email…",
    // unconfigured cart_pdf_email/template) — surface them to the modal.
    console.error("[sendCartOfferEmail] Error emailing offer:", error)
    return { ok: false, error: error?.message ?? "send-failed" }
  }
}
