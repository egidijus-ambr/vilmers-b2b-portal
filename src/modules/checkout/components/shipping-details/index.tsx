"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Radio from "@modules/common/components/radio"
import ChevronDown from "@modules/common/icons/chevron-down"

const ORDER_TYPES = [
  { value: "expo", label: "Expo" },
  { value: "customer", label: "Customer" },
  { value: "stock", label: "Stock" },
]

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isPastDay(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []

  // Pad start with nulls for days before the 1st
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function formatMonthYear(year: number, month: number, locale: string): string {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" }).toUpperCase()
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Notify parent of default order type on mount
  useEffect(() => {
    onShippingChange(orderType, null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const localeMap: Record<string, string> = {
    en: "en-GB", de: "de-DE", fr: "fr-FR", lt: "lt-LT", da: "da-DK",
  }
  const locale = localeMap[language] || "en-GB"

  const calendarDays = useMemo(
    () => getCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  function handleOrderTypeChange(value: string) {
    setOrderType(value)
    onShippingChange(value, selectedDate)
  }

  function handleDateSelect(date: Date) {
    if (isPastDay(date)) return
    setSelectedDate(date)
    setIsCalendarOpen(false)
    onShippingChange(orderType, date)
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
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
      <div ref={calendarRef} className="relative">
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          Desired delivery date  (optional)
        </label>
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="w-full flex items-center justify-between h-14 px-3 text-base border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors"
        >
          <span className={selectedDate ? "text-dark-blue" : "text-gray-500"}>
            {selectedDate
              ? selectedDate.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
              : "Select a date"}
          </span>
          <ChevronDown size="14" className="flex-shrink-0 ml-2" />
        </button>

        {isCalendarOpen && (
        <div className="absolute z-50 mt-1 w-full border border-gray-300 bg-white shadow-md p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 text-dark-blue hover:opacity-70"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-medium text-dark-blue tracking-widest">
              {formatMonthYear(viewYear, viewMonth, locale)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 text-dark-blue hover:opacity-70"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-dark-blue py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} />
              }

              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isDisabled = isPastDay(date)
              const isToday = isSameDay(date, today)

              return (
                <div key={date.toISOString()} className="flex items-center justify-center py-1">
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDateSelect(date)}
                    className={`
                      flex items-center justify-center w-10 h-10 text-sm rounded-full transition-colors
                      ${isSelected
                        ? "bg-dark-blue text-white"
                        : isDisabled
                          ? "text-gray-300 cursor-not-allowed"
                          : isToday
                            ? "text-dark-blue font-semibold hover:bg-gray-100"
                            : "text-dark-blue hover:bg-gray-100"
                      }
                    `}
                  >
                    {date.getDate()}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        )}

        {selectedDate && (
          <div className="flex items-center gap-x-2 mt-3 px-3 py-2.5 bg-blue-50 rounded">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-blue-700">The exact delivery week will be provided after order confirmation.</span>
          </div>
        )}
      </div>
    </div>
  )
}
