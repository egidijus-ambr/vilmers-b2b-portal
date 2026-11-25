"use client"

import InteractiveLink from "@modules/common/components/interactive-link"
import { useTranslations } from "@lib/i18n"

export default function CartNotFoundContent() {
  const { t: tc } = useTranslations("common")

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-ui-fg-base">{tc("page-not-found")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {tc("cart-not-found-description")}
      </p>
      <InteractiveLink href="/">{tc("go-to-frontpage")}</InteractiveLink>
    </div>
  )
}
