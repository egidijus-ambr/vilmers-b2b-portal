"use client"

import { verifyMagicLinkAction } from "@lib/data/customer"
import Button from "@modules/common/components/button"
import { useActionState } from "react"
import { useTranslation } from "react-i18next"

interface MagicLinkClientProps {
  token: string
  languageCode: string
}

/**
 * Explicit Continue button (stage 2c-3, plan §3.3): nothing is submitted
 * without a click. On success the action redirects; otherwise it returns a
 * state: "expired" (used / expired / unknown link: request a new one; the
 * current session, if any, is kept), "unavailable" (try again: the button
 * stays) or "error" (request a new link).
 */
export default function MagicLinkClient({
  token,
  languageCode,
}: MagicLinkClientProps) {
  const { t } = useTranslation()
  const [state, formAction, isPending] = useActionState(
    verifyMagicLinkAction,
    null
  )

  const status = state?.status ?? null
  const canContinue = status === null || status === "unavailable"
  const message =
    status === "expired"
      ? t("magic-link-expired")
      : status === "unavailable"
      ? t("magic-link-unavailable")
      : status === "error"
      ? t("magic-link-error")
      : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 px-4">
        <div className="text-center">
          <h2 className="mt-6 text-center font-extrabold text-gray-900">
            {t("magic-link-continue-title")}
          </h2>
          {canContinue && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("magic-link-continue-description")}
            </p>
          )}
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

        {canContinue ? (
          <form action={formAction} className="flex justify-center">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="languageCode" value={languageCode} />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full"
              data-testid="magic-link-continue"
            >
              {isPending ? "..." : t("magic-link-continue")}
            </Button>
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
      </div>
    </div>
  )
}
