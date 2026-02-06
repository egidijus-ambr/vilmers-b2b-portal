"use client"

import { CompactLanguageSwitcher, useTranslations } from "@lib/i18n"

export default function TopBar() {
  const { t, isReady } = useTranslations()

  return (
    <div className="hidden small:block bg-dark-blue">
      <div className="h-8 w-full px-10 flex items-center justify-between text-xs text-white font-['Montserrat']">
        <CompactLanguageSwitcher size="small" dropdownAlign="left" />

        <div className="flex items-center gap-x-3">
        </div>
      </div>
    </div>
  )
}
