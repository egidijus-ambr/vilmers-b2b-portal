"use client"

import { useActionState } from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { subscribeNewsletter, NewsletterState } from "@lib/data/newsletter"
import Button from "@modules/common/components/button"

interface NewsletterBlockProps {
  languageCode: string
}

export default function NewsletterBlock({
  languageCode,
}: NewsletterBlockProps) {
  const { t } = useTranslation()

  const [state, formAction, isPending] = useActionState<
    NewsletterState | null,
    FormData
  >(subscribeNewsletter, null)

  return (
    <section
      className="w-full flex flex-col md:flex-row"
      data-testid="newsletter-block"
      data-language={languageCode}
    >
      {/* Left: image */}
      <div className="relative w-full md:w-1/2 h-64 md:h-auto md:min-h-[480px]">
        <Image
          src="/newsletter.jpg"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {/* Right: cream panel */}
      <div className="w-full md:w-1/2 bg-[#f2f0eb] flex items-center px-6 py-12 small:px-12 small:py-16">
        <div className="w-full max-w-lg">
          <span className="block text-xs font-medium uppercase tracking-[0.2em] text-dark-blue-70">
            {t("newsletter-eyebrow", "NEWSLETTER")}
          </span>

          <h2 className="mt-4 text-3xl small:text-4xl font-medium leading-tight text-dark-blue">
            {t(
              "newsletter-heading",
              "Stay ahead of the trends – subscribe now for the latest arrivals and be the first"
            )}
          </h2>

          <form action={formAction} className="mt-8 space-y-4">
            <input
              type="email"
              name="email"
              aria-label={t("newsletter-placeholder", "Type your Email here")}
              placeholder={t("newsletter-placeholder", "Type your Email here")}
              className="w-full h-14 px-4 text-base bg-white border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
            />

            <Button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2"
            >
              {t("newsletter-submit", "Submit")}
              <span aria-hidden="true">→</span>
            </Button>
          </form>

          {state?.success && (
            <p className="mt-4 text-base text-dark-blue">
              {t("newsletter-success", "Thanks for subscribing!")}
            </p>
          )}

          {state?.error && (
            <p className="mt-4 text-base text-red-600">
              {t("newsletter-error", "Something went wrong. Please try again.")}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
