"use client"

import { useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import type { CustomerFile } from "@lib/furnisystems-sdk/modules/customer/types"

const formatBytes = (bytes?: number | null): string => {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
      if (!response.ok) return
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
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 bg-white flex flex-col justify-start items-start gap-4">
      <h3 className="self-stretch text-dark-blue font-medium">
        {t("files.title")}
      </h3>
      <ul className="self-stretch flex flex-col">
        {files.map(file => (
          <li
            key={file.id}
            className="flex items-center justify-between gap-4 py-3 border-b border-dark-blue/10 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-dark-blue text-sm sm:text-base">
                {file.name}
              </p>
              {file.size_bytes ? (
                <p className="text-dark-blue-70 text-xs">
                  {formatBytes(file.size_bytes)}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => handleDownload(file)}
              disabled={downloadingId === file.id}
              className={`shrink-0 inline-flex items-center text-sm font-medium text-gold hover:text-gold/80 transition-colors${
                downloadingId === file.id ? " opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {t("files.download")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CustomerFilesCard
