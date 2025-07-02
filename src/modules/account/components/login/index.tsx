import { requestMagicLink } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { use, useActionState, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "next/navigation"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction, isPending] = useActionState(
    requestMagicLink,
    null
  )
  const [isSuccess, setIsSuccess] = useState(false)
  const { t } = useTranslation()
  const params = useParams()
  const languageCode = params.languageCode as string

  // Check if the message indicates success
  useEffect(() => {
    if (message && typeof message === "object" && message.success) {
      setIsSuccess(true)
    } else if (message) {
      // If there's a message but it's not a success object, it's an error
      setIsSuccess(false)
    }
  }, [message])

  if (isSuccess) {
    return (
      <div className="w-full" data-testid="login-success-page">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl text-gray-900 mb-4">
            {t("check-your-inbox")}
          </h1>
          <p className="text-gray-600 mb-8">{t("magic-link-sent")}</p>
          <button
            onClick={() => setIsSuccess(false)}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {t("send-another-link")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="login-page">
      <h1 className="text-2xl text-gray-900 mb-8">{t("loginToYourAccount")}</h1>

      <form className="space-y-6" action={formAction}>
        <input type="hidden" name="language" value={languageCode} />

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("email-placeholder")}
            className="w-full px-3 py-2 border border-gray-300 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="email-input"
          />
        </div>

        <ErrorMessage
          error={typeof message === "string" ? message : null}
          data-testid="login-error-message"
        />

        <button
          type="submit"
          disabled={isPending}
          data-testid="sign-in-button"
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-3xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              {t("signing-in", "Signing in...")}
            </>
          ) : (
            t("log-in")
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">{t("magic-link-description")}</p>
      </div>
    </div>
  )
}

export default Login
