"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@medusajs/ui"

import { useTranslations } from "@lib/i18n"
import Modal from "@modules/common/components/modal"
import Input from "@modules/common/components/input"

interface MissingReferenceModalProps {
  isOpen: boolean
  onConfirm: (reference: string) => void
  onCancel: () => void
}

export function MissingReferenceModal({
  isOpen,
  onConfirm,
  onCancel,
}: MissingReferenceModalProps) {
  const [reference, setReference] = useState("")
  const { t } = useTranslations("account")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReference("")
      // Auto-focus after modal transition
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} close={onCancel} size="small">
      <Modal.Title>{t("reference-required-title")}</Modal.Title>
      <Modal.Description>{t("reference-required-description")}</Modal.Description>
      <Modal.Body>
        <div className="w-full">
          <Input
            ref={inputRef}
            label={t("customer-reference")}
            name="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && reference.trim()) {
                onConfirm(reference.trim())
              }
            }}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(reference.trim())}
            disabled={!reference.trim()}
          >
            {t("add-to-cart")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
