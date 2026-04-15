"use client"

import React, { useActionState } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "next/navigation"
import Link from "next/link"
import { sendPartnerRequest, PartnerRequestState } from "@lib/data/partner"
import Button from "@modules/common/components/button"
import { useFormStatus } from "react-dom"
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@modules/common/components/form-input"
import Back from "@modules/common/icons/back"

function SubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? "..." : children}
    </Button>
  )
}

const COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "OTHER", name: "Other" },
]

export default function BecomePartnerPage() {
  const { t } = useTranslation()
  const params = useParams()
  const languageCode = params.languageCode as string

  const [state, formAction] = useActionState<
    PartnerRequestState | null,
    FormData
  >(sendPartnerRequest, null)

  const isSuccess = state?.success === true
  const errorMessage = state?.error
  const fieldErrors = state?.fieldErrors || {}

  if (isSuccess) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center"
        style={{ backgroundImage: "url(/images/login_background.png)" }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-screen py-12">
            <div className="w-full max-w-[670px]">
              <div className="bg-white shadow-xl p-8 sm:p-10">
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
                    {t("partner-request-sent")}
                  </h1>
                  <p className="text-gray-600 mb-8">
                    {t("partner-request-sent-description")}
                  </p>
                  <Link
                    href={`/${languageCode}/account`}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("back-to-login")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center"
      style={{ backgroundImage: "url(/images/login_background.png)" }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Back to login link */}
      <Link
        href={`/${languageCode}/account`}
        className="absolute top-6 left-6 z-20 flex items-center text-white hover:text-gray-200 transition-colors"
      >
        <Back className="mr-2" />
        {t("back-to-login")}
      </Link>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-screen py-12">
          <div className="w-full max-w-[670px]">
            <div className="bg-white shadow-xl p-8 sm:p-10">
              <h1 className="text-2xl font-medium text-gray-900 mb-2">
                {t("become-partner-title")}
              </h1>
              <p className="text-gray-600 mb-6 text-sm">
                {t("become-partner-description")}
              </p>

              <form className="space-y-5" action={formAction}>
                <FormInput
                  id="companyName"
                  name="companyName"
                  type="text"
                  label={t("company-name")}
                  placeholder={t("company-name-placeholder")}
                  error={fieldErrors.companyName && t("field-required")}
                />

                <FormInput
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  label={t("contact-email")}
                  placeholder={t("contact-email-placeholder")}
                  error={fieldErrors.contactEmail && t("field-required")}
                />

                <FormInput
                  id="companyCode"
                  name="companyCode"
                  type="text"
                  label={t("company-code")}
                  placeholder={t("company-code-placeholder")}
                />

                <FormInput
                  id="vatCode"
                  name="vatCode"
                  type="text"
                  label={t("vat-code")}
                  placeholder={t("vat-code-placeholder")}
                />

                <FormSelect
                  id="country"
                  name="country"
                  defaultValue=""
                  label={t("country")}
                >
                  <option value="" disabled>
                    {t("country-placeholder")}
                  </option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </FormSelect>

                <FormInput
                  id="expectedTurnover"
                  name="expectedTurnover"
                  type="text"
                  label={t("expected-turnover")}
                  placeholder={t("expected-turnover-placeholder")}
                />

                <FormTextarea
                  id="message"
                  name="message"
                  rows={4}
                  label={t("message")}
                  placeholder={t("message-placeholder")}
                />

                {/* Error Message */}
                {errorMessage && (
                  <div className="text-red-600 text-base">{errorMessage}</div>
                )}

                {/* Submit Button */}
                <SubmitButton className="w-full h-14">
                  {t("send-request")}
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
