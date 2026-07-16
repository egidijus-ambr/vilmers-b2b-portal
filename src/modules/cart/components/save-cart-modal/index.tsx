"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Heading } from "@medusajs/ui"
import { useTranslations } from "@lib/i18n"
import { useCart } from "@lib/context/cart-context"
import Modal from "@modules/common/components/modal"
import SearchInput from "@modules/common/components/search-input"
import Button from "@modules/common/components/button"

interface SaveCartModalProps {
  isOpen: boolean
  onClose: () => void
}

type Phase = "name" | "saved"

const SaveCartModal = ({ isOpen, onClose }: SaveCartModalProps) => {
  const { t } = useTranslations("account")
  const router = useRouter()
  const params = useParams()
  const languageCode = params?.languageCode as string
  const { cart, saveActiveCart, startNewCart } = useCart()

  const [phase, setPhase] = useState<Phase>("name")
  const [name, setName] = useState(cart?.name ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Reset state every time the modal opens. Intentionally only depends on
  // `isOpen`: saving renames the active cart (changing cart?.name), and we must
  // NOT re-reset back to the "name" phase when that happens.
  useEffect(() => {
    if (isOpen) {
      setPhase("name")
      setName(cart?.name ?? "")
      setError(null)
      setPending(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t("cart-name") + " *")
      return
    }
    setError(null)
    setPending(true)
    const res = await saveActiveCart(trimmed)
    setPending(false)
    if (res.ok) {
      setPhase("saved")
    } else {
      setError(res.error ?? null)
    }
  }

  const handleStartNew = async () => {
    setError(null)
    setPending(true)
    const res = await startNewCart()
    setPending(false)
    if (res.ok) {
      onClose()
    } else {
      setError(res.error ?? null)
    }
  }

  const handleViewSavedCarts = () => {
    onClose()
    router.push(`/${languageCode}/account/carts`)
  }

  return (
    <Modal isOpen={isOpen} close={onClose} size="small" data-testid="save-cart-modal">
      <Modal.Title>
        <Heading level="h3" className="mb-2 text-[1.5rem] leading-tight">{t("save-the-cart")}</Heading>
      </Modal.Title>
      <Modal.Body>
        <div className="w-full flex flex-col gap-y-4">
          {phase === "name" ? (
            <>
              <SearchInput
                label={t("cart-name")}
                placeholder={t("cart-name")}
                showSearchIcon={false}
                value={name}
                onChange={setName}
                autoFocus
                data-testid="cart-name-input"
              />
              {error && (
                <div className="text-rose-500 text-small-regular">{error}</div>
              )}
              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  data-testid="save-cart-cancel-button"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={pending}
                  data-testid="save-cart-save-button"
                >
                  {t("save")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-small-regular text-dark-blue">
                {t("cart-saved")}
              </p>
              {error && (
                <div className="text-rose-500 text-small-regular">{error}</div>
              )}
              <div className="flex flex-col gap-3 mt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full"
                  data-testid="save-cart-continue-button"
                >
                  {t("continue-using-this-cart")}
                </Button>
                <Button
                  onClick={handleStartNew}
                  disabled={pending}
                  className="w-full"
                  data-testid="save-cart-start-new-button"
                >
                  {t("start-new-cart")}
                </Button>
                <button
                  type="button"
                  onClick={handleViewSavedCarts}
                  className="text-sm text-dark-blue underline text-center mt-1"
                  data-testid="save-cart-view-carts-button"
                >
                  {t("view-saved-carts")}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal.Body>
    </Modal>
  )
}

export default SaveCartModal
