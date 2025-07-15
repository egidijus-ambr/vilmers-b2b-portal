import { requestMagicLink } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useActionState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "next/navigation"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const { t } = useTranslation()
  const params = useParams()
  const languageCode = params.languageCode as string

  const [state, formAction] = useActionState(requestMagicLink, null)

  // Check if the result indicates success
  const isSuccess = state && typeof state === "object" && state.success
  // Check if the result is an error message
  const errorMessage = typeof state === "string" ? state : null

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
            onClick={() => window.location.reload()}
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

        <ErrorMessage error={errorMessage} data-testid="login-error-message" />

        <SubmitButton data-testid="sign-in-button" className="w-full">
          {t("log-in")}
        </SubmitButton>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">{t("magic-link-description")}</p>
      </div>
    </div>
  )
}

export default Login
