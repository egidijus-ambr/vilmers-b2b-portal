"use client"

import { CompactLanguageSwitcher, useTranslations } from "@lib/i18n"
import { activeTheme } from "themes"

export default function TopBar() {
  const { t, isReady } = useTranslations()
  const { languageSwitcher } = activeTheme.layout

  return (
    <div className="hidden small:block bg-top-menu-background">
      <div className="h-8 w-full px-10 flex items-center justify-between text-xs text-top-menu-foreground">
        {languageSwitcher.placement === "top-bar" && (
          <CompactLanguageSwitcher size="small" dropdownAlign="left" />
        )}

        <div className="flex items-center gap-x-3">
        </div>
      </div>
    </div>
  )
}
