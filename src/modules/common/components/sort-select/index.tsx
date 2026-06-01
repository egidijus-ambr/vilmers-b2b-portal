"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import ChevronDown from "@modules/common/icons/chevron-down"

export interface SortOption {
  value: string
  label: string
}

interface SortSelectProps {
  options: SortOption[]
  value: string
  onChange: (value: string) => void
}

export default function SortSelect({ options, value, onChange }: SortSelectProps) {
  const currentOption = options.find((o) => o.value === value) ?? options[0]

  const handleChange = (option: SortOption) => {
    onChange(option.value)
  }

  return (
    <Listbox value={currentOption} onChange={handleChange}>
      <div className="relative">
        <ListboxButton className="flex items-center justify-center gap-x-2 h-[56px] border border-gray-300 px-5 text-sm text-gray-700 hover:border-gray-400 transition-colors">
          <span>
            {(() => {
              const label = currentOption?.label ?? ""
              const parenIdx = label.lastIndexOf(" (")
              if (parenIdx === -1) return label
              return (
                <>
                  {label.slice(0, parenIdx)}{" "}
                  <span className="whitespace-nowrap">{label.slice(parenIdx + 1)}</span>
                </>
              )
            })()}
          </span>
          <ChevronDown size="14" />
        </ListboxButton>
        <ListboxOptions className="absolute right-0 mt-1 z-50 bg-white border border-gray-300 shadow-md min-w-[200px]">
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option}
              className="px-5 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 data-[selected]:font-semibold"
            >
              {option.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
