"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n"
import Button from "@modules/common/components/button"
import { toast } from "@medusajs/ui"

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  no_customer: "pricelist-export.no-customer",
  no_pricelist: "pricelist-export.no-pricelist",
  unauthorized: "pricelist-export.unauthorized",
  fetch_failed: "pricelist-export.fetch-failed",
  unexpected: "pricelist-export.unexpected",
  not_found: "pricelist-export.not-found",
  forbidden: "pricelist-export.forbidden",
}

const POLL_INTERVAL_MS = 2000
// Give up polling after this long (server watchdog is 5 minutes).
const POLL_GIVE_UP_MS = 8 * 60 * 1000

type Phase = "idle" | "products" | "queued" | "images" | "building"

class ExportError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.error === "string") return body.error
  } catch {
    // Non-JSON error body — fall through to the generic code.
  }
  return "unexpected"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const PricelistExportCard = () => {
  const { t } = useTranslations("account")
  const params = useParams()
  const languageCode = (params.languageCode as string) || "en"
  const [phase, setPhase] = useState<Phase>("idle")
  const mounted = useRef(true)
  const lastFileError = useRef("not_found")

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const setPhaseSafe = (p: Phase) => {
    if (mounted.current) setPhase(p)
  }

  const start = async (): Promise<string> => {
    setPhaseSafe("products")
    const response = await fetch("/api/pricelist/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: languageCode }),
    })
    if (!response.ok) throw new ExportError(await readErrorCode(response))
    const body = await response.json()
    return body.status === "ready"
      ? `ready:${body.jobId}`
      : `pending:${body.jobId}`
  }

  // Resolves to a ready jobId. A not_found while polling (server restart,
  // job expiry) re-POSTs once; the retry is instant if the file is cached.
  const waitUntilReady = async (retried = false): Promise<string> => {
    const started = await start()
    const [state, jobId] = started.split(":") as [string, string]
    if (state === "ready") return jobId

    setPhaseSafe("queued")
    const pollStart = Date.now()
    for (;;) {
      if (Date.now() - pollStart > POLL_GIVE_UP_MS) {
        throw new ExportError("unexpected")
      }
      await sleep(POLL_INTERVAL_MS)
      if (!mounted.current) throw new ExportError("cancelled")
      const response = await fetch(
        `/api/pricelist/export/status?jobId=${encodeURIComponent(jobId)}`
      )
      if (!response.ok) {
        const code = await readErrorCode(response)
        if (code === "not_found" && !retried) return waitUntilReady(true)
        throw new ExportError(code)
      }
      const body = await response.json()
      if (body.status === "ready") return jobId
      if (body.status === "error") {
        throw new ExportError(body.errorCode ?? "unexpected")
      }
      setPhaseSafe(
        body.status === "running" && body.stage === "building"
          ? "building"
          : body.status === "running"
            ? "images"
            : "queued"
      )
    }
  }

  const download = async (jobId: string): Promise<boolean> => {
    const response = await fetch(
      `/api/pricelist/export/file?jobId=${encodeURIComponent(jobId)}`
    )
    if (!response.ok) {
      const code = await readErrorCode(response)
      // 403 (job/customer mismatch) is handled like a vanished file:
      // the caller re-POSTs once, and a repeat surfaces `forbidden`.
      if (code === "not_found" || code === "forbidden") {
        lastFileError.current = code
        return false
      }
      throw new ExportError(code)
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
    return true
  }

  const handleDownload = async () => {
    try {
      let jobId = await waitUntilReady()
      // The file can vanish between ready and download (superseded by a
      // newer build, or a one-shot temp file); retry the whole flow once.
      if (!(await download(jobId))) {
        jobId = await waitUntilReady(true)
        if (!(await download(jobId))) throw new ExportError(lastFileError.current)
      }
    } catch (error) {
      const code = error instanceof ExportError ? error.code : "unexpected"
      if (code !== "cancelled") {
        toast.error(
          t(ERROR_MESSAGE_KEYS[code] ?? "pricelist-export.download-failed")
        )
      }
    } finally {
      setPhaseSafe("idle")
    }
  }

  const busy = phase !== "idle"

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
      <Button
        onClick={handleDownload}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center justify-center gap-2"
      >
        {busy && (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
        )}
        {t("pricelist-export.button")}
      </Button>
    </div>
  )
}

export default PricelistExportCard
