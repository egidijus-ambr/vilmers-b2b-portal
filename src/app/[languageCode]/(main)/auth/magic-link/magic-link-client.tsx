"use client"

import {
  verifyMagicLinkAction,
  type MagicLinkVerifyState,
} from "@lib/data/customer"
import Button from "@modules/common/components/button"
import { startTransition, useActionState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

interface MagicLinkClientProps {
  /** Empty when rendering a no-JS fallback failure (`initialStatus`). */
  token: string
  languageCode: string
  initialStatus?: NonNullable<MagicLinkVerifyState>["status"]
}

/**
 * Auto-continue landing: on mount the verify action runs exactly once (a ref
 * guards against Strict Mode's double mount and re-renders). v1 links are
 * reusable within their TTL, so running it without a click is safe. On
 * success the action redirects; otherwise it returns a state: "expired"
 * (expired / unknown link: request a new one), "unavailable" (try again: the
 * button comes back) or "error" (request a new link). A user who is already
 * logged in is redirected by the action instead of seeing a failure.
 *
 * Without JavaScript nothing auto-runs: the <noscript> form posts to
 * ./verify/route.ts instead (a native POST from this no-referrer page carries
 * `Origin: null`, which Next's server-action handler rejects). A failure there
 * comes back as `initialStatus` with no token: nothing to retry, so every
 * status then offers a new link.
 */
export default function MagicLinkClient({
  token,
  languageCode,
  initialStatus,
}: MagicLinkClientProps) {
  const { t } = useTranslation()
  const [state, formAction, isPending] = useActionState<
    MagicLinkVerifyState,
    FormData
  >(verifyMagicLinkAction, initialStatus ? { status: initialStatus } : null)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current || !token) return
    submitted.current = true
    const formData = new FormData()
    formData.set("token", token)
    formData.set("languageCode", languageCode)
    startTransition(() => formAction(formData))
  }, [formAction, token, languageCode])

  const status = state?.status ?? null
  const message =
    status === "expired"
      ? t("magic-link-expired")
      : status === "unavailable"
      ? t("magic-link-unavailable")
      : status === "error"
      ? t("magic-link-error")
      : null
  // Waiting for the automatic verify, a retry, or the success redirect.
  const signingIn = status === null || isPending

  const continueButton = (
    <Button
      type="submit"
      disabled={isPending}
      className="w-full"
      data-testid="magic-link-continue"
    >
      {t("magic-link-continue")}
    </Button>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 px-4">
        {signingIn ? (
          <div className="text-center" data-testid="magic-link-signing-in">
            {/* No JS: hide the spinner, show the Continue fallback instead. */}
            <noscript>
              <style>{"[data-magic-link-auto]{display:none!important}"}</style>
            </noscript>
            <div data-magic-link-auto="">
              <div
                className="mx-auto h-16 w-16 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  className="animate-spin h-8 w-8 text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <h2
                className="mt-6 text-center font-extrabold text-gray-900"
                role="status"
              >
                {t("magic-link-signing-in")}
              </h2>
            </div>
            <noscript>
              <h2 className="mt-6 text-center font-extrabold text-gray-900">
                {t("magic-link-continue-title")}
              </h2>
              <p className="mt-2 mb-8 text-center text-sm text-gray-600">
                {t("magic-link-continue-description")}
              </p>
              <form
                action={`/${languageCode}/auth/magic-link/verify`}
                method="post"
                className="flex justify-center"
              >
                <input type="hidden" name="token" value={token} />
                {continueButton}
              </form>
            </noscript>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="mt-6 text-center font-extrabold text-gray-900">
                {t("magic-link-continue-title")}
              </h2>
            </div>

            {message && (
              <p
                className="text-center text-sm text-red-500"
                role="alert"
                data-testid="magic-link-message"
              >
                {message}
              </p>
            )}

            {status === "unavailable" && token ? (
              // Retry (JS): the same server action as the automatic run.
              <form action={formAction} className="flex justify-center">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="languageCode" value={languageCode} />
                {continueButton}
              </form>
            ) : (
              <div className="text-center">
                <a
                  href={`/${languageCode}/account`}
                  className="text-blue-600 hover:text-blue-800 underline"
                  data-testid="magic-link-request-new"
                >
                  {t("magic-link-request-new")}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
