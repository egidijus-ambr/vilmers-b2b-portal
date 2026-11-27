"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"
import { getPageByCode } from "./pages"
import { Page } from "@lib/furnisystems-sdk"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import {
  partnerRequestBody,
  partnerRequestError,
} from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { runCmsCall, v1SessionPost } from "./cms-v1"
import { describeV1Error } from "./me-v1"

const SEND_PARTNER_REQUEST_MUTATION = gql`
  mutation SendPartnerRequest(
    $companyName: String!
    $companyCode: String
    $vatCode: String
    $country: String
    $message: String
    $expectedTurnover: String
    $contactEmail: String!
  ) {
    sendPartnerRequest(
      companyName: $companyName
      companyCode: $companyCode
      vatCode: $vatCode
      country: $country
      message: $message
      expectedTurnover: $expectedTurnover
      contactEmail: $contactEmail
    )
  }
`

export interface PartnerRequestState {
  success: boolean
  error?: string
  /** Stable code for the client to translate; `error` stays as the English fallback. */
  errorCode?: "failed" | "error"
  fieldErrors?: Record<string, string>
}

/**
 * Server action wrapper around `getPageByCode` for the "become-partner" CMS
 * page, so the client component (become-partner page) can fetch it without
 * importing the server-only `pages.ts` helpers directly.
 */
export const getBecomePartnerPage = async (
  language?: string
): Promise<Page | null> => {
  return getPageByCode("become-partner", language)
}

export async function sendPartnerRequest(
  _currentState: PartnerRequestState | null,
  formData: FormData
): Promise<PartnerRequestState> {
  try {
    const companyName = formData.get("companyName") as string
    const companyCode = formData.get("companyCode") as string
    const vatCode = formData.get("vatCode") as string
    const country = formData.get("country") as string
    const message = formData.get("message") as string
    const expectedTurnover = (formData.get("expectedTurnover") as string) || undefined
    const contactEmail = formData.get("contactEmail") as string

    const fieldErrors: Record<string, string> = {}
    if (!companyName) fieldErrors.companyName = "required"
    if (!contactEmail) fieldErrors.contactEmail = "required"

    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        fieldErrors,
      }
    }

    // v1: POST /public/partner-request with only the declared fields
    // (empty ones omitted: the schema is strict and rejects null); the
    // recipient is the shop's, chosen on the server. A v1 401 re-routes to
    // the GraphQL mutation; other failures: partnerRequestError (400 ->
    // field errors / "failed", 429 / 503 -> "error" = try again later).
    const body = partnerRequestBody({
      companyName,
      companyCode,
      vatCode,
      country,
      message,
      expectedTurnover,
      contactEmail,
    })
    type Outcome = PartnerRequestState | { graphql: true }
    const outcome = await runCmsCall<Outcome>("partner request", {
      v1: async (bearer) => {
        await v1SessionPost(bearer, "/public/partner-request", body)
        return { success: true }
      },
      graphql: async () => ({ graphql: true as const }),
      onError: (error) => {
        if (!isV1ProblemError(error)) {
          console.error("Error sending partner request:", describeV1Error(error))
        }
        const mapped = partnerRequestError(
          isV1ProblemError(error) ? error : { status: 0 }
        )
        if (mapped.fieldErrors) return { success: false, fieldErrors: mapped.fieldErrors }
        return {
          success: false,
          error:
            mapped.errorCode === "error"
              ? "An error occurred. Please try again later."
              : "Failed to send request. Please try again.",
          errorCode: mapped.errorCode,
        }
      },
    })
    if (!("graphql" in outcome)) return outcome

    const client = sdk.getApolloClient()

    const { data } = await client.mutate({
      mutation: SEND_PARTNER_REQUEST_MUTATION,
      variables: {
        companyName,
        companyCode,
        vatCode,
        country,
        message,
        expectedTurnover,
        contactEmail,
      },
    })

    if (data?.sendPartnerRequest) {
      return { success: true }
    } else {
      return {
        success: false,
        error: "Failed to send request. Please try again.",
        errorCode: "failed",
      }
    }
  } catch (error: any) {
    console.error("Error sending partner request:", error)
    return {
      success: false,
      error: "An error occurred. Please try again later.",
      errorCode: "error",
    }
  }
}
