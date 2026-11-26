"use client"

import { ArrowUpRight } from "lucide-react"
import { Text } from "@medusajs/ui"
import Link from "next/link"

import { useTranslations } from "@lib/i18n"

export default function NotFoundContent() {
  const { t } = useTranslations("common")

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className=" text-ui-fg-base">{t("page-not-found")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("page-not-found-description")}
      </p>
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="text-ui-fg-interactive">{t("go-to-frontpage")}</Text>
        <ArrowUpRight
          size={15}
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}
