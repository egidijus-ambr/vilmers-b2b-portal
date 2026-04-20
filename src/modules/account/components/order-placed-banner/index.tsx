"use client"

import { useTranslations } from "@lib/i18n"

type OrderPlacedBannerProps = {
  onClose: () => void
}

export default function OrderPlacedBanner({ onClose }: OrderPlacedBannerProps) {
  const { t } = useTranslations("account")

  return (
    <div
      role="status"
      data-testid="order-placed-banner"
      className="flex items-center justify-between gap-3 p-4 mb-6 bg-green-50 border border-green-200 text-green-800"
    >
      <span className="text-sm font-medium">
        {t("order-successfully-placed")}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="text-green-800 hover:opacity-70 text-lg leading-none px-2"
      >
        ✕
      </button>
    </div>
  )
}
