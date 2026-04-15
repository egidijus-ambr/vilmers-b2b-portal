"use client"

import { useState, useRef, useEffect } from "react"

export interface Address {
  id: number
  address_1: string
  address_2: string | null
  city: string
  postal_code: string
  country: string
  state_region: string | null
  roles: string | null
  description: string | null
}

interface AddressSelectProps {
  addresses: Address[]
  selectedAddressId: number | null
  onSelect: (address: Address) => void
  placeholder?: string
}

function formatAddress(addr: Address): string {
  const parts = [addr.address_1, addr.address_2, addr.city, addr.postal_code, addr.country].filter(Boolean)
  return parts.join(", ")
}

export default function AddressSelect({
  addresses,
  selectedAddressId,
  onSelect,
  placeholder = "Select an address",
}: AddressSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = addresses.find((a) => a.id === selectedAddressId)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-ui-border-base rounded-md bg-ui-bg-field text-left text-base-regular hover:bg-ui-bg-field-hover"
      >
        <span className={selected ? "text-ui-fg-base" : "text-ui-fg-muted"}>
          {selected ? formatAddress(selected) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && addresses.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-ui-border-base rounded-md shadow-lg max-h-60 overflow-auto">
          {addresses.map((addr) => (
            <li key={addr.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(addr)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 hover:bg-ui-bg-field-hover ${
                  addr.id === selectedAddressId ? "bg-ui-bg-field" : ""
                }`}
              >
                <div className="text-sm font-medium text-ui-fg-base">
                  {addr.description || addr.address_1}
                </div>
                <div className="text-sm text-ui-fg-subtle">
                  {formatAddress(addr)}
                </div>
                {addr.roles && (
                  <div className="flex gap-1 mt-1">
                    {addr.roles.split(";").map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-gray-100 px-2 py-0.5 rounded text-ui-fg-subtle"
                      >
                        {role.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
