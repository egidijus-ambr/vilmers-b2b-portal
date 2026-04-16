"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import ChevronDown from "@modules/common/icons/chevron-down"

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
  const selected = addresses.find((a) => a.id === selectedAddressId) ?? null

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {label}
        </label>
      )}
      <Listbox value={selected} onChange={(addr) => addr && onSelect(addr)}>
        <div className="relative">
          <ListboxButton className="w-full flex items-center justify-between h-14 px-3 text-base border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors">
            <span className={selected ? "text-dark-blue truncate" : "text-gray-500"}>
              {selected ? formatAddress(selected) : placeholder}
            </span>
            <ChevronDown size="14" className="flex-shrink-0 ml-2" />
          </ListboxButton>
          <ListboxOptions className="absolute z-50 mt-1 w-full bg-white border border-gray-300 shadow-md max-h-60 overflow-auto">
            {addresses.map((addr) => (
              <ListboxOption
                key={addr.id}
                value={addr}
                className="px-3 py-3 cursor-pointer hover:bg-gray-100 data-[selected]:bg-gray-50"
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
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}
