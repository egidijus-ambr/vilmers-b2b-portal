// src/modules/layout/components/show-all-products-toggle/index.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { setShowAllProductsCookie } from "@lib/util/show-all-products-cookie"

const TOOLTIP =
  "Show all products, including those not available in the customer's pricelist or market."

type Props = {
  initialChecked: boolean
}

export default function ShowAllProductsToggle({ initialChecked }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState(initialChecked)
  const [, startTransition] = useTransition()

  const onChange = (next: boolean) => {
    setChecked(next)
    setShowAllProductsCookie(next)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-dark-blue cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-dark-blue cursor-pointer"
      />
      <span>All products</span>
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
