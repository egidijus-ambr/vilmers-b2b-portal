// src/modules/layout/components/go-to-configurator-toggle/index.tsx
"use client"

import { useGoToConfigurator } from "@lib/context/go-to-configurator-context"

const TOOLTIP =
  "When on, clicking an advanced product opens its configurator directly. Non-advanced products open the normal product page."

export default function GoToConfiguratorToggle() {
  const { enabled, setEnabled } = useGoToConfigurator()

  return (
    <label className="inline-flex items-center gap-2 text-sm text-dark-blue cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        className="h-4 w-4 accent-dark-blue cursor-pointer"
      />
      <span>Open configurator</span>
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
