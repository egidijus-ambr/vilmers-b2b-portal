"use client"

import { useState, useMemo, useRef } from "react"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import ChevronDown from "@modules/common/icons/chevron-down"
import SearchInput from "@modules/common/components/search-input"

const COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH", "GB", "US",
]

interface CountrySelectProps {
  value: string
  onChange: (code: string) => void
  label?: string
  placeholder?: string
  language?: string
}

export default function CountrySelect({
  value,
  onChange,
  label,
  placeholder = "Select country",
  language = "en",
}: CountrySelectProps) {
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  const displayNames = useMemo(
    () => new Intl.DisplayNames(language, { type: "region" }),
    [language]
  )

  const countries = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({
        code,
        name: displayNames.of(code) ?? code,
      })).sort((a, b) => a.name.localeCompare(b.name, language)),
    [displayNames, language]
  )

  const filtered = search
    ? countries.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries

  const selectedCountry = countries.find((c) => c.code === value) ?? null

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {label}
        </label>
      )}
      <Listbox
        value={value}
        onChange={(code) => {
          onChange(code)
          setSearch("")
        }}
      >
        <div className="relative">
          <ListboxButton className="w-full flex items-center justify-between h-14 px-3 text-base border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors">
            <span className={selectedCountry ? "text-dark-blue" : "text-gray-500"}>
              {selectedCountry ? selectedCountry.name : placeholder}
            </span>
            <ChevronDown size="14" className="flex-shrink-0 ml-2" />
          </ListboxButton>
          <ListboxOptions
            className="absolute z-50 mt-1 w-full bg-white border border-gray-300 shadow-md max-h-80 overflow-auto"
            ref={() => setTimeout(() => searchRef.current?.focus(), 0)}
          >
            <div
              className="sticky top-0 bg-white p-2 border-b border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <SearchInput
                ref={searchRef}
                value={search}
                onChange={setSearch}
                placeholder="Search countries..."
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            {filtered.map((country) => (
              <ListboxOption
                key={country.code}
                value={country.code}
                className="px-3 py-3 cursor-pointer hover:bg-gray-100 data-[selected]:bg-gray-50 text-base text-dark-blue"
              >
                {country.name}
              </ListboxOption>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">
                No countries found
              </div>
            )}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}
