"use client"

import React from "react"
import { useTranslations } from "@lib/i18n"
import { useCart } from "@lib/context/cart-context"
import useToggleState from "@lib/hooks/use-toggle-state"
import Button from "@modules/common/components/button"
import SaveCartModal from "@modules/cart/components/save-cart-modal"

const SaveCartButton = () => {
  const { t } = useTranslations("account")
  const { cart, items } = useCart()
  const { state: isOpen, open, close } = useToggleState(false)

  // Don't offer to save an empty cart.
  if (!cart || items.length === 0) {
    return null
  }

  return (
    <>
      <Button
        variant="secondary"
        className="w-full"
        onClick={open}
        data-testid="save-cart-button"
      >
        {t("save-the-cart")}
      </Button>
      <SaveCartModal isOpen={isOpen} onClose={close} />
    </>
  )
}

export default SaveCartButton
