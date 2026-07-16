"use client"

import { impersonateLoginAction } from "./actions"
import { useEffect, useActionState } from "react"

interface ImpersonateClientProps {
  token: string
  languageCode: string
}

export default function ImpersonateClient({
  token,
  languageCode,
}: ImpersonateClientProps) {
  const [state, formAction, isPending] = useActionState(
    impersonateLoginAction,
    null
  )

  useEffect(() => {
    const form = document.getElementById(
      "impersonate-form"
    ) as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center">
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
          <h2 className="mt-6 text-center font-extrabold text-gray-900">
            Logging you in
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we set up your session...
          </p>
        </div>

        <form id="impersonate-form" action={formAction} className="hidden">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="languageCode" value={languageCode} />
        </form>
      </div>
    </div>
  )
}
