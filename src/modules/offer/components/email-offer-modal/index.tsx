"use client"

import { useEffect, useState } from "react"
import Modal from "@modules/common/components/modal"
import Button from "@modules/common/components/button"
import { useTranslations } from "@lib/i18n"
import { generateOfferPdf } from "@modules/offer/lib/generate-offer-pdf"
import { sendCartOfferEmail } from "@lib/data/offer-pdf"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = "idle" | "sending" | "success" | "error"

interface EmailOfferModalProps {
  isOpen: boolean
  close: () => void
  cartId: number
  defaultEmail?: string
}

export default function EmailOfferModal({
  isOpen,
  close,
  cartId,
  defaultEmail = "",
}: EmailOfferModalProps) {
  const { t } = useTranslations("account")
  const [email, setEmail] = useState(defaultEmail)
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Reset to a clean prefilled state each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail)
      setStatus("idle")
      setErrorMsg(null)
    }
  }, [isOpen, defaultEmail])

  const valid = EMAIL_RE.test(email.trim())
  const sending = status === "sending"

  const handleClose = () => {
    if (sending) return
    close()
  }

  const handleSend = async () => {
    if (!valid || sending) return
    setStatus("sending")
    setErrorMsg(null)
    try {
      const { base64 } = await generateOfferPdf()
      const res = await sendCartOfferEmail(cartId, base64, email.trim())
      if (res.ok) {
        setStatus("success")
      } else {
        setStatus("error")
        if (res.error === "session") {
          setErrorMsg(t("email-session-expired"))
        } else if (res.error === "send-failed") {
          setErrorMsg(t("email-send-failed"))
        } else {
          // Surface the backend's own message.
          setErrorMsg(res.error)
        }
      }
    } catch (err) {
      console.error("Failed to email offer:", err)
      setStatus("error")
      setErrorMsg(t("email-send-failed"))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      close={handleClose}
      size="small"
      data-testid="email-offer-modal"
    >
      <Modal.Title>{t("email-modal-title")}</Modal.Title>
      <Modal.Body className="flex-col items-stretch gap-2 pt-2">
        <div className="flex w-full flex-col gap-2">
          <label
            htmlFor="offer-email-input"
            className="text-sm text-dark-blue-70"
          >
            {t("email-address")}
          </label>
          <input
            id="offer-email-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === "error" || status === "success") setStatus("idle")
            }}
            disabled={sending}
            className="w-full rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50"
            data-testid="email-offer-input"
          />
          {email.trim().length > 0 && !valid && (
            <span className="text-xs text-red-600">{t("email-invalid")}</span>
          )}
          {status === "success" && (
            <span
              className="text-sm text-green-600"
              data-testid="email-offer-sent"
            >
              {t("email-sent")}
            </span>
          )}
          {status === "error" && errorMsg && (
            <span
              className="text-sm text-red-600"
              data-testid="email-offer-error"
            >
              {errorMsg}
            </span>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
            data-testid="email-offer-cancel"
          >
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!valid || sending}
            data-testid="email-offer-send"
          >
            {sending ? t("sending") : t("send")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
