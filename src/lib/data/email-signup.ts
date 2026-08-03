"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"
import { subscribeToMailerlite } from "./mailerlite"

export interface EmailSignupState {
  success: boolean
  error?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SignupDelivery = "email" | "mailerlite"

// Only used to pick the delivery branch below. `config` (including
// `notify_email`, if present) is publicly readable via this same query, but
// `notify_email` is never read out of it here — the actual delivery
// destination is resolved and used server-side by the `sendEmailSignup`
// mutation, and this action never trusts or forwards a destination supplied
// by the client.
const GET_CONTENT_BLOCK_CONFIG = gql`
  query GetContentBlockConfig($id: Int!) {
    findUniqueContentBlock(where: { id: $id }) {
      id
      type
      config
    }
  }
`

const SEND_EMAIL_SIGNUP_MUTATION = gql`
  mutation SendEmailSignup(
    $content_block_id: Int!
    $email: String!
    $language: String
  ) {
    sendEmailSignup(
      content_block_id: $content_block_id
      email: $email
      language: $language
    )
  }
`

// Defaults to "email" (the mutation path, no client-side third-party call,
// no env-var dependency) on any failure, not-found, or type mismatch.
async function getSignupDelivery(blockId: number): Promise<SignupDelivery> {
  try {
    const client = sdk.getApolloClient()
    const { data } = await client.query({
      query: GET_CONTENT_BLOCK_CONFIG,
      variables: { id: blockId },
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    })

    const block = data?.findUniqueContentBlock as
      | { type?: string; config?: Record<string, unknown> | null }
      | null
      | undefined

    if (!block || block.type !== "email_signup") {
      return "email"
    }

    return block.config?.delivery === "mailerlite" ? "mailerlite" : "email"
  } catch (error) {
    console.error("Error resolving email-signup block delivery:", error)
    return "email"
  }
}

export async function subscribeEmailSignup(
  _currentState: EmailSignupState | null,
  formData: FormData
): Promise<EmailSignupState> {
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const blockIdRaw = formData.get("content_block_id") as string | null
  const language = (formData.get("language") as string | null)?.trim() || undefined

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  const blockId = blockIdRaw ? Number(blockIdRaw) : NaN
  if (!Number.isInteger(blockId) || blockId <= 0) {
    return { success: false, error: "Something went wrong. Please try again." }
  }

  const delivery = await getSignupDelivery(blockId)

  if (delivery === "mailerlite") {
    const result = await subscribeToMailerlite(email)

    // Unlike newsletter.ts's hardcoded block, this is an admin-configured,
    // production-facing lead-capture block: a missing MAILERLITE_API_KEY
    // must not present as success while silently discarding the lead. Show
    // the same generic copy as any other failure — never leak config state
    // (e.g. "MailerLite is not configured") to visitors.
    if (result.skipped) {
      return {
        success: false,
        error: "Something went wrong. Please try again.",
      }
    }

    return result
  }

  try {
    const client = sdk.getApolloClient()
    const { data } = await client.mutate({
      mutation: SEND_EMAIL_SIGNUP_MUTATION,
      variables: {
        content_block_id: blockId,
        email,
        language,
      },
    })

    const result = data?.sendEmailSignup as
      | { success?: boolean; message?: string }
      | null
      | undefined

    if (result?.success) {
      return { success: true }
    }

    return {
      success: false,
      error: result?.message || "Something went wrong. Please try again.",
    }
  } catch (error) {
    console.error("Error sending email signup:", error)
    return {
      success: false,
      error: "An error occurred. Please try again later.",
    }
  }
}
