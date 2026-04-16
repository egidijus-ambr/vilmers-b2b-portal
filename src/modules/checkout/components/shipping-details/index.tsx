"use client"

import { useState, useMemo } from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import ChevronDown from "@modules/common/icons/chevron-down"
import Radio from "@modules/common/components/radio"

const ORDER_TYPES = [
  { value: "expo", label: "Expo" },
  { value: "customer", label: "Customer" },
  { value: "stock", label: "Stock" },
]

function getUpcomingMondays(count: number, locale: string): { value: string; label: string; date: Date }[] {
  const dates: { value: string; label: string; date: Date }[] = []
  const now = new Date()
  const current = new Date(now)

  // Move to next Monday
  const day = current.getDay()
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  current.setDate(current.getDate() + daysUntilMonday)

  for (let i = 0; i < count; i++) {
    const d = new Date(current)
    dates.push({
      value: d.toISOString(),
      label: d.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      date: d,
    })
    current.setDate(current.getDate() + 7)
  }
  return dates
}

interface ShippingDetailsProps {
  onShippingChange: (orderType: string, deliveryDate: Date | null) => void
  language?: string
}

export default function ShippingDetails({
  onShippingChange,
  language = "en",
}: ShippingDetailsProps) {
  const [orderType, setOrderType] = useState("expo")
  const [selectedDate, setSelectedDate] = useState<string>("")

  const localeMap: Record<string, string> = {
    en: "en-GB", de: "de-DE", fr: "fr-FR", lt: "lt-LT", da: "da-DK",
  }
  const dates = useMemo(
    () => getUpcomingMondays(12, localeMap[language] || "en-GB"),
    [language]
  )

  const selectedDateObj = dates.find((d) => d.value === selectedDate)

  function handleOrderTypeChange(value: string) {
    setOrderType(value)
    onShippingChange(value, selectedDate ? new Date(selectedDate) : null)
  }

  function handleDateChange(value: string) {
    setSelectedDate(value)
    onShippingChange(orderType, value ? new Date(value) : null)
  }

  return (
    <div className="flex flex-col gap-y-6">
      <h2 className="text-xl md:text-2xl font-medium text-gray-900">
        Shipping details
      </h2>

      {/* Order type */}
      <div>
        <label className="block text-sm font-medium text-dark-blue mb-3">
          Order type
        </label>
        <div className="flex items-center gap-x-6">
          {ORDER_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className="flex items-center gap-x-2"
              onClick={() => handleOrderTypeChange(type.value)}
            >
              <Radio checked={orderType === type.value} />
              <span className="text-base text-dark-blue">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delivery date */}
      <div className="w-full">
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          Delivery date
        </label>
        <Listbox value={selectedDate} onChange={handleDateChange}>
          <div className="relative">
            <ListboxButton className="w-full flex items-center justify-between h-14 px-3 text-base border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors">
              <span className={selectedDateObj ? "text-dark-blue" : "text-gray-500"}>
                {selectedDateObj ? selectedDateObj.label : "Choose date from the list"}
              </span>
              <ChevronDown size="14" className="flex-shrink-0 ml-2" />
            </ListboxButton>
            <ListboxOptions className="absolute z-50 mt-1 w-full bg-white border border-gray-300 shadow-md max-h-80 overflow-auto">
              {dates.map((d) => (
                <ListboxOption
                  key={d.value}
                  value={d.value}
                  className="px-3 py-3 cursor-pointer hover:bg-gray-100 data-[selected]:bg-gray-50 text-base text-dark-blue"
                >
                  {d.label}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>
    </div>
  )
}
