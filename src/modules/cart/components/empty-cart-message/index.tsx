"use client"

import { Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import { useTranslations } from "@lib/i18n"

const EmptyCartMessage = () => {
  const { t } = useTranslations("account")
  return (
    <div className="pt-8 px-2 flex flex-col items-start" data-testid="empty-cart-message">
      <Text className="text-base-regular mb-6 max-w-[32rem]">
        {t("cart-empty-cta")}
      </Text>
      <div>
        <InteractiveLink href="/store">{t("explore-products")}</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
