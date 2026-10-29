"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useNewBadgeDays } from "@lib/context/new-badge-context"
import { isNewWithinDays } from "@lib/util/is-new"

type NewBadgeProps = {
  /** "card": absolute-positioning-friendly larger chip; "pill": small inline chip */
  variant?: "card" | "cardLarge" | "pill"
  className?: string
}

const VARIANT_CLASSES = {
  card: "text-white text-xs font-semibold px-2 py-0.5 rounded-full",
  // Matches the category chip on the product card (sizing + bg-gold-30), with
  // theme gold text instead of the green fill.
  cardLarge:
    "bg-gold-30 text-gold text-sm font-semibold uppercase px-3 py-2 rounded-full",
  pill: "text-white text-[10px] font-semibold px-1.5 py-1 rounded-full leading-none",
} as const

// Colour is overridable per brand via --new-badge-bg; the theming system has
// no suitable green accent, so #a3b19c remains the default.
const BG_STYLE = { backgroundColor: "var(--new-badge-bg, #a3b19c)" }

/**
 * Shows the badge when `createdAt` is within `days` days. Pass `days` for a
 * fixed rule (product photos: 30); omit it to use the shop-wide setting.
 * Everything time-dependent is evaluated after mount so SSR and hydration
 * never disagree about the clock.
 */
export default function NewBadge({
  createdAt,
  days,
  variant = "card",
  className,
}: NewBadgeProps & {
  createdAt?: string | Date | null
  days?: number
}) {
  const { t } = useTranslations("common")
  const settingDays = useNewBadgeDays()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !isNewWithinDays(createdAt, days ?? settingDays)) return null
  return (
    <span
      className={`${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ""}`}
      style={variant === "cardLarge" ? undefined : BG_STYLE}
    >
      {t("new")}
    </span>
  )
}
