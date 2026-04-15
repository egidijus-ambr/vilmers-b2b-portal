"use client"

import { useState, useEffect, useRef } from "react"

import { useTranslations } from "@lib/i18n"
import Modal from "@modules/common/components/modal"
import SearchInput from "@modules/common/components/search-input"
import Button from "@modules/common/components/button"

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
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} close={onCancel} size="small">
      <Modal.Title>{t("reference-required-title")}</Modal.Title>
      <Modal.Description>{t("reference-required-description")}</Modal.Description>
      <Modal.Body>
        <SearchInput
          ref={inputRef}
          value={reference}
          onChange={setReference}
          placeholder={t("reference-placeholder")}
          showSearchIcon={false}
          label={t("customer-reference")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reference.trim()) {
              onConfirm(reference.trim())
            }
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={() => onConfirm(reference.trim())}
            disabled={!reference.trim()}
          >
            {t("add-to-cart")}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
