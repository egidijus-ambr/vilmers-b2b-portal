"use server"

import { sdk } from "@lib/config"
import { validateSession } from "@lib/util/session-validation"
import { unstable_noStore } from "next/cache"
import { CartOfferData } from "@lib/furnisystems-sdk/modules/offer-pdf/types"
import { features } from "@lib/features"
import { getActingCustomer } from "./acting-customer"
import { actingCustomerIdForV1 } from "./v1-acting"
import {
  resolveV1CartCaller,
  runCartCall,
  v1EmailCartOffer,
  v1GetCartOffer,
} from "./carts-v1"

/*
 * Cart offers on REST v1 (portal REST slice 9): GET /me/carts/:id/offer and
 * POST /me/carts/:id/offer/email, with the acting header of the carts
 * (./carts-v1.ts: no retry without it), or the unchanged GraphQL
 * getCartOfferData / emailCartOffer on a legacy-only session or after a v1
 * 401. The PDF itself is rendered in the browser
 * (src/modules/offer/lib/generate-offer-pdf.ts); the backend's
 * renderCartOfferPdf had no caller and is gone from the SDK.
 */

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

/** v1 only: the decoded-size cap of POST /me/carts/:id/offer/email (backend MAX_OFFER_PDF_BYTES). */
const MAX_OFFER_PDF_BYTES = 3_500_000

/** v1 only: the caller of an offer call (./carts-v1.ts resolveV1CartCaller). */
function v1Caller(bearer: string) {
  return resolveV1CartCaller(bearer, {
    actingHeader: actingCustomerIdForV1,
    owner: async () => {
      const acting = await getActingCustomer()
      return acting?.id != null ? Number(acting.id) : null
    },
  })
}

/** The v1 route refused the PDF as too large (no backend call made). */
class OfferPdfTooLargeError extends Error {
  constructor() {
    super("offer PDF too large")
    this.name = "OfferPdfTooLargeError"
  }
}

/**
 * Fetch the structured offer data (context + items) used by the HTML offer
 * template, with the `da → dk` language normalization.
 */
export const getCartOffer = async (
  cartId: number,
  language: string
): Promise<CartOfferData | null> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return null

    const opts = {
      language: LANGUAGE_TO_BACKEND[language] ?? language,
      showPvm: features.showPvm,
      showVolume: features.showVolume,
      vatRate: 0.21,
    }

    return await runCartCall<CartOfferData | null>("getCartOffer", {
      v1: async (bearer) => v1GetCartOffer(await v1Caller(bearer), cartId, opts),
      graphql: () => sdk.offerPdf.getCartOfferData(cartId, opts),
    })
  } catch (error) {
    console.error("[getCartOffer] Error fetching offer data:", error)
    return null
  }
}

/**
 * Codes the e-mail modal translates (src/modules/offer/components/
 * email-offer-modal): "session", "send-failed", "rate-limited",
 * "too-large". Any other string is a backend message shown as is.
 */
function emailError(error: any): string {
  if (error instanceof OfferPdfTooLargeError) return "too-large"
  if (error?.name === "V1ProblemError") {
    const status = error.status as number
    if (status === 401) return "session"
    if (status === 429) return "rate-limited"
    // Not configured / not sent: the same answer as GraphQL `false`.
    if (status === 503) return "send-failed"
    if (status === 413) return "too-large"
    if (status === 400 && typeof error.detail === "string" && /larger than/i.test(error.detail)) {
      return "too-large"
    }
    // 422 "No recipient email: ..." and other backend-written messages.
    if (typeof error.detail === "string" && error.detail) return error.detail
    return "send-failed"
  }
  // GraphQL: the backend's own message (e.g. "No recipient email…").
  return error?.message ?? "send-failed"
}

/**
 * Email a client-generated offer PDF to the customer (or an explicit
 * recipient). Same session/auth gate as the other offer actions.
 *
 * The PDF MUST arrive as a File inside a FormData argument, never as a
 * (base64) string argument: React's server-action reply decoder counts string
 * length toward a 1,000,000-slot budget whenever the args array has more than
 * one element, so a >1MB base64 string throws "Maximum array nesting exceeded".
 * FormData/File parts are outlined and not counted.
 *
 * Expected fields: cartId, pdf (File), recipientEmail (optional).
 * Both backends take `pdfBase64`, so we encode here. v1 checks that it is a
 * PDF (`%PDF-`) of at most 3.5 MB: on the v1 transport a larger file is
 * answered "too-large" here without a backend call, and the e-mail modal
 * rebuilds the PDF at a lower setting. The GraphQL transport has no cap
 * (unchanged).
 */
export const sendCartOfferEmail = async (
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> => {
  unstable_noStore()

  try {
    const validation = await validateSession()
    if (!validation.isValid) return { ok: false, error: "session" }

    const cartId = Number(formData.get("cartId"))
    const pdf = formData.get("pdf")
    const rawEmail = formData.get("recipientEmail")
    const recipientEmail =
      typeof rawEmail === "string" && rawEmail.trim()
        ? rawEmail.trim()
        : undefined

    if (!Number.isInteger(cartId) || !(pdf instanceof Blob) || pdf.size === 0) {
      return { ok: false, error: "send-failed" }
    }

    const encode = async () => Buffer.from(await pdf.arrayBuffer()).toString("base64")
    const fileName = `cart-offer-${cartId}.pdf`

    const sent = await runCartCall<boolean>("sendCartOfferEmail", {
      v1: async (bearer) => {
        // v1 caps the decoded PDF (backend MAX_OFFER_PDF_BYTES); the modal
        // then rebuilds it smaller. GraphQL has no such check (unchanged).
        if (pdf.size > MAX_OFFER_PDF_BYTES) throw new OfferPdfTooLargeError()
        await v1EmailCartOffer(await v1Caller(bearer), cartId, {
          pdfBase64: await encode(),
          recipientEmail,
          fileName,
        })
        return true
      },
      graphql: async () =>
        sdk.offerPdf.emailCartOffer(cartId, await encode(), {
          fileName,
          recipientEmail,
        }),
    })
    // GraphQL returned false without throwing -> generic failure.
    return sent ? { ok: true } : { ok: false, error: "send-failed" }
  } catch (error: any) {
    console.error("[sendCartOfferEmail] Error emailing offer:", error)
    return { ok: false, error: emailError(error) }
  }
}
