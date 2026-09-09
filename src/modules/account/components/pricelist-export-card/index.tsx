"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n"
import Button from "@modules/common/components/button"
import { toast } from "@medusajs/ui"

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  no_customer: "pricelist-export.no-customer",
  no_pricelist: "pricelist-export.no-pricelist",
}

const PricelistExportCard = () => {
  const { t } = useTranslations("account")
  const params = useParams()
  const languageCode = (params.languageCode as string) || "en"
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(
        `/api/pricelist/export?language=${encodeURIComponent(languageCode)}`
      )
      if (!response.ok) {
        // The route always returns a machine-readable `error` code (not a
        // localized message) so this stays translated regardless of the
        // backend's language.
        let code = "unexpected"
        try {
          const body = await response.json()
          if (typeof body?.error === "string") code = body.error
        } catch {
          // Non-JSON error body — fall through to the generic message.
        }
        toast.error(
          t(ERROR_MESSAGE_KEYS[code] ?? "pricelist-export.download-failed")
        )
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      const disposition = response.headers.get("content-disposition")
      anchor.download =
        disposition?.match(/filename="([^"]+)"/)?.[1] ?? "pricelist.xlsx"
      anchor.style.display = "none"
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("pricelist-export.download-failed"))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 bg-white flex flex-col justify-start items-start gap-4">
      <div className="self-stretch flex flex-col justify-start items-start gap-2">
        <h3 className="font-medium text-dark-blue">
          {t("pricelist-export.title")}
        </h3>
        <p className="text-dark-blue-70 text-sm sm:text-base font-normal">
          {t("pricelist-export.description")}
        </p>
      </div>
      <Button onClick={handleDownload} disabled={downloading}>
        {downloading
          ? t("pricelist-export.downloading")
          : t("pricelist-export.button")}
      </Button>
    </div>
  )
}

export default PricelistExportCard
