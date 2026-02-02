"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

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
  fieldErrors?: Record<string, string>
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
      }
    }
  } catch (error: any) {
    console.error("Error sending partner request:", error)
    return {
      success: false,
      error: "An error occurred. Please try again later.",
    }
  }
}
