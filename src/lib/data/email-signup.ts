"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"
import { subscribeToMailerlite } from "./mailerlite"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import { emailSignupErrorCode } from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { runCmsCall, v1SessionGet, v1SessionPost } from "./cms-v1"
import { describeV1Error } from "./me-v1"

export interface EmailSignupState {
  success: boolean
  error?: string
  /** Stable code for the client to translate; `error` stays as the English fallback. */
  errorCode?: "invalid-email" | "generic" | "later"
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

// Defaults to "email" (the server-side notification path, no client-side
// third-party call, no env-var dependency) on any failure, not-found, or
// type mismatch.
//
// v1: GET /catalog/content-blocks/:id with the session's bearer (a block of
// a private CMS page is 404 for a guest; `config` never carries the
// server-side notify_email). GraphQL for legacy-only sessions / a v1 401.
async function getSignupDelivery(blockId: number): Promise<SignupDelivery> {
  const block = await runCmsCall<{ type?: string; config?: unknown } | null>(
    `content block ${blockId}`,
    {
      v1: (bearer) => v1SessionGet(bearer, `/catalog/content-blocks/${blockId}`),
      graphql: () => getSignupBlockGraphql(blockId),
      onError: () => null,
    }
  )
  if (!block || block.type !== "email_signup") return "email"
  const config = block.config as Record<string, unknown> | null | undefined
  return config?.delivery === "mailerlite" ? "mailerlite" : "email"
}

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getSignupBlockGraphql(
  blockId: number
): Promise<{ type?: string; config?: unknown } | null> {
  try {
    const client = sdk.getApolloClient()
    const { data } = await client.query({
      query: GET_CONTENT_BLOCK_CONFIG,
      variables: { id: blockId },
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    })
    return (data?.findUniqueContentBlock as { type?: string; config?: unknown } | null) ?? null
  } catch (error) {
    console.error("Error resolving email-signup block delivery:", error)
    return null
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
    return {
      success: false,
      error: "Please enter a valid email address.",
      errorCode: "invalid-email",
    }
  }

  const blockId = blockIdRaw ? Number(blockIdRaw) : NaN
  if (!Number.isInteger(blockId) || blockId <= 0) {
    return {
      success: false,
      error: "Something went wrong. Please try again.",
      errorCode: "generic",
    }
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
        errorCode: "generic",
      }
    }

    if (!result.success) {
      return {
        success: false,
        error: "Something went wrong. Please try again.",
        errorCode: "generic",
      }
    }

    return result
  }

  // v1: POST /public/email-signup { contentBlockId, email, language? }; the
  // recipient is resolved on the server (never sent from here). A v1 401
  // re-routes to the GraphQL mutation; other failures map to the existing
  // error codes (400 email -> invalid-email, 429 / 503 -> later, else
  // generic): emailSignupErrorCode.
  type SignupOutcome = EmailSignupState | { graphql: true }
  const outcome = await runCmsCall<SignupOutcome>(`email signup ${blockId}`, {
    v1: async (bearer) => {
      await v1SessionPost(bearer, "/public/email-signup", {
        contentBlockId: blockId,
        email,
        // Optional; only a well-formed code (backend LANGUAGE_RE), else omitted.
        ...(language && /^[a-zA-Z_-]{1,10}$/.test(language)
          ? { language: language.toLowerCase() }
          : {}),
      })
      return { success: true }
    },
    graphql: async () => ({ graphql: true as const }),
    onError: (error) => {
      const errorCode = isV1ProblemError(error)
        ? emailSignupErrorCode(error)
        : emailSignupErrorCode({ status: 0 })
      if (!isV1ProblemError(error)) {
        console.error("Error sending email signup:", describeV1Error(error))
      }
      return {
        success: false,
        error:
          errorCode === "invalid-email"
            ? "Please enter a valid email address."
            : errorCode === "later"
            ? "An error occurred. Please try again later."
            : "Something went wrong. Please try again.",
        errorCode,
      }
    },
  })
  if (!("graphql" in outcome)) return outcome
  return sendEmailSignupGraphql(blockId, email, language)
}

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function sendEmailSignupGraphql(
  blockId: number,
  email: string,
  language: string | undefined
): Promise<EmailSignupState> {
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

    // A backend-supplied message is already user-facing text; only the
    // static fallback gets a translatable code.
    return {
      success: false,
      error: result?.message || "Something went wrong. Please try again.",
      errorCode: result?.message ? undefined : "generic",
    }
  } catch (error) {
    console.error("Error sending email signup:", error)
    return {
      success: false,
      error: "An error occurred. Please try again later.",
      errorCode: "later",
    }
  }
}
