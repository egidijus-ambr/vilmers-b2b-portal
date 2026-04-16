"use client"

import { useState, useRef, useEffect } from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import ChevronDown from "@modules/common/icons/chevron-down"
import SearchInput from "@modules/common/components/search-input"

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

function matchesSearch(addr: Address, query: string): boolean {
  const lower = query.toLowerCase()
  return [
    addr.description,
    addr.address_1,
    addr.address_2,
    addr.city,
    addr.postal_code,
    addr.country,
    addr.state_region,
    addr.roles,
  ].some((field) => field?.toLowerCase().includes(lower))
}

export default function AddressSelect({
  addresses,
  selectedAddressId,
  onSelect,
  label,
  placeholder = "Select an address",
}: AddressSelectProps) {
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = addresses.find((a) => a.id === selectedAddressId) ?? null
  const filtered = search ? addresses.filter((a) => matchesSearch(a, search)) : addresses

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {label}
        </label>
      )}
      <Listbox
        value={selected}
        onChange={(addr) => {
          if (addr) {
            onSelect(addr)
            setSearch("")
          }
        }}
      >
        <div className="relative">
          <ListboxButton className="w-full flex items-center justify-between h-14 px-3 text-base border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors">
            <span className={selected ? "text-dark-blue truncate" : "text-gray-500"}>
              {selected ? formatAddress(selected) : placeholder}
            </span>
            <ChevronDown size="14" className="flex-shrink-0 ml-2" />
          </ListboxButton>
          <ListboxOptions
            className="absolute z-50 mt-1 w-full bg-white border border-gray-300 shadow-md max-h-80 overflow-auto"
            ref={() => setTimeout(() => searchRef.current?.focus(), 0)}
          >
            <div className="sticky top-0 bg-white p-2 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
              <SearchInput
                ref={searchRef}
                value={search}
                onChange={setSearch}
                placeholder="Search addresses..."
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            {filtered.map((addr) => (
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
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">
                No addresses found
              </div>
            )}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}
