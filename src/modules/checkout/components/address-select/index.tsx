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
  label?: string
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
  label,
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
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-14 flex items-center justify-between px-3 text-base border border-gray-300 bg-white text-left leading-5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={selected ? "text-dark-blue" : "text-gray-500"}>
          {selected ? formatAddress(selected) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && addresses.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 shadow-lg max-h-60 overflow-auto">
          {addresses.map((addr) => (
            <li key={addr.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(addr)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-3 hover:bg-gray-50 ${
                  addr.id === selectedAddressId ? "bg-gray-50" : ""
                }`}
              >
                <div className="text-sm font-medium text-dark-blue">
                  {addr.description || addr.address_1}
                </div>
                <div className="text-sm text-gray-500">
                  {formatAddress(addr)}
                </div>
                {addr.roles && (
                  <div className="flex gap-1 mt-1">
                    {addr.roles.split(";").map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500"
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
