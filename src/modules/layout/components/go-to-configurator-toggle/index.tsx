// src/modules/layout/components/go-to-configurator-toggle/index.tsx
"use client"

import { useGoToConfigurator } from "@lib/context/go-to-configurator-context"
import { useTranslations } from "@lib/i18n"

export default function GoToConfiguratorToggle() {
  const { t } = useTranslations("common")
  const { enabled, setEnabled } = useGoToConfigurator()
  const TOOLTIP = t("open-configurator-tooltip")

  return (
    <label className="inline-flex items-center gap-2 text-sm text-dark-blue cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        className="h-4 w-4 accent-dark-blue cursor-pointer"
      />
      <span>{t("open-configurator")}</span>
      <span
        aria-label={TOOLTIP}
        title={TOOLTIP}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-dark-blue text-[10px] leading-none text-dark-blue cursor-help"
      >
        i
      </span>
    </label>
  )
}
