"use client"

import { useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { CatalogDownloadIcon } from "@modules/common/icons/catalog-download"
import type { CustomerFile } from "@lib/furnisystems-sdk/modules/customer/types"
import { toast } from "@medusajs/ui"

const CustomerFilesCard = (): JSX.Element | null => {
  const { t } = useTranslations("account")
  const { actingCustomer } = useActingCustomer()
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  // `actingCustomer` is null when an agent is signed in without a selected
  // customer — no company, so no files. `files` can also come back `null`
  // (not just missing) from the searchCustomers() hydration path used when
  // an agent/admin is acting for a selected customer, hence the `?? []`.
  const files: CustomerFile[] = [
    ...(((actingCustomer as any)?.files as CustomerFile[]) ?? []),
  ].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  if (files.length === 0) return null

  const handleDownload = async (file: CustomerFile) => {
    setDownloadingId(file.id)
    try {
      const response = await fetch(`/api/customer-files/${file.id}`)
      if (!response.ok) {
        toast.error(t("files.download-failed"))
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = file.original_name ?? file.name
      anchor.style.display = "none"
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("files.download-failed"))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 bg-white flex flex-col justify-start items-start gap-4">
      <h3 className="mb-6 font-medium text-dark-blue">{t("files.title")}</h3>
      <div className="self-stretch grid grid-cols-1 md:grid-cols-2 gap-6">
        {files.map(file => (
          // Row markup kept as a single block (icon + filename + download
          // handling) so future restyles stay a small, reviewable diff.
          <button
            key={file.id}
            type="button"
            onClick={() => handleDownload(file)}
            disabled={downloadingId === file.id}
            className={`flex flex-row items-center gap-4 text-left${
              downloadingId === file.id ? " opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <span aria-hidden="true" className="flex-shrink-0">
              <CatalogDownloadIcon className="w-6 h-6 flex-shrink-0 text-gold" />
            </span>
            <span className="font-bold text-dark-blue text-sm leading-tight">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CustomerFilesCard
