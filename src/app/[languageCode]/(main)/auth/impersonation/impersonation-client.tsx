"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { useTranslations } from "@lib/i18n"
import Button from "@modules/common/components/button"
import { exchangeImpersonationAction, type ImpersonationState } from "./actions"

interface ImpersonationClientProps {
  languageCode: string
}

/** The `code` parameter of a `#code=...` fragment, or null. */
function readCodeFromFragment(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  try {
    const code = new URLSearchParams(raw).get("code")
    return code && code.length <= 256 ? code : null
  } catch {
    return null
  }
}

/**
 * Reads the handoff code from the fragment exactly once (a ref guards
 * against Strict Mode's double mount: the code is single-use, a second
 * submit would burn it and show an error), removes the fragment from the
 * address bar and history before anything else, then runs the exchange
 * action. On success the action redirects; otherwise it returns a state.
 * Only "unavailable" offers a retry, with the code kept in memory.
 */
export default function ImpersonationClient({
  languageCode,
}: ImpersonationClientProps) {
  const { t } = useTranslations("common")
  const [state, formAction, isPending] = useActionState<
    ImpersonationState,
    FormData
  >(exchangeImpersonationAction, null)
  const [missingCode, setMissingCode] = useState(false)
  const code = useRef<string | null>(null)
  const started = useRef(false)

  const submit = () => {
    if (!code.current) return
    const formData = new FormData()
    formData.set("code", code.current)
    formData.set("languageCode", languageCode)
    startTransition(() => formAction(formData))
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    code.current = readCodeFromFragment(window.location.hash)
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      )
    }
    if (!code.current) {
      setMissingCode(true)
      return
    }
    submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status = missingCode ? "expired" : state?.status ?? null
  const working = status === null || isPending

  const message =
    status === "expired"
      ? t("impersonation-expired")
      : status === "unavailable"
      ? t("impersonation-unavailable")
      : status === "error"
      ? t("impersonation-error")
      : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 px-4">
        {working ? (
          <div className="text-center" data-testid="impersonation-working">
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
              {t("impersonate-logging-in")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("impersonate-please-wait")}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <p
              className="text-sm text-red-500"
              role="alert"
              data-testid="impersonation-message"
            >
              {message}
            </p>
            {status === "unavailable" && (
              <div className="flex justify-center">
                <Button
                  onClick={submit}
                  disabled={isPending}
                  data-testid="impersonation-retry"
                >
                  {t("impersonation-retry")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
