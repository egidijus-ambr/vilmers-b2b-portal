"use client"

import { useTranslations } from "@lib/i18n"
import InteractiveLink from "@modules/common/components/interactive-link"

export default function NotFoundContent() {
  const { t } = useTranslations("common")

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className=" text-ui-fg-base">{t("page-not-found")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("page-not-found-description")}
      </p>
      <InteractiveLink href="/">{t("go-to-frontpage")}</InteractiveLink>
    </div>
  )
}
