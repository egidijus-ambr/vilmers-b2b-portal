"use client"

import { useState } from "react"
import { useTranslations } from "@lib/i18n"

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-7 w-[380px] shadow-xl">
        <h3 className="text-lg font-semibold text-dark-blue mb-1">
          {t["reference-required-title"]}
        </h3>
        <p className="text-sm text-dark-blue-70 mb-5">
          {t["reference-required-description"]}
        </p>

        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {t["customer-reference"]}
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t["reference-placeholder"]}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue mb-5"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && reference.trim()) {
              onConfirm(reference.trim())
            }
          }}
        />

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-dark-blue-70 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            {t["cancel"]}
          </button>
          <button
            onClick={() => onConfirm(reference.trim())}
            disabled={!reference.trim()}
            className="px-4 py-2 text-sm text-white bg-dark-blue rounded-md hover:bg-dark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t["add-to-cart"]}
          </button>
        </div>
      </div>
    </div>
  )
}
