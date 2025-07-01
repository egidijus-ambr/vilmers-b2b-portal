import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { use, useActionState, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const { t } = useTranslation()

  return (
    <div className="w-full" data-testid="login-page">
      <h1 className="text-2xl text-gray-900 mb-8">{t("loginToYourAccount")}</h1>

      <form className="space-y-6" action={formAction}>
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
            className="w-full px-3 py-2 border border-gray-300  shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="email-input"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder={t("password-placeholder")}
            className="w-full px-3 py-2 border border-gray-300 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="password-input"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="mt-1 h-5 w-5 text-gray-800 focus:ring-blue-500 border-gray-00 "
          />
          <label
            htmlFor="remember-me"
            className="font-medium text-gray-900 cursor-pointer leading-none !text-sm !transform-none pt-1"
          >
            {t("remember-me")}
          </label>
        </div>

        <ErrorMessage error={message} data-testid="login-error-message" />

        <button
          type="submit"
          data-testid="sign-in-button"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-3xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
        >
          {t("log-in")}
        </button>
      </form>
    </div>
  )
}

export default Login
