"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import { useRouter, useSearchParams } from "next/navigation"
import ChevronDown from "@modules/common/icons/chevron-down"
import { CategorySortOption } from "@lib/furnisystems-sdk/modules/products/types"

const SORT_OPTIONS_KEYS: { value: CategorySortOption; labelKey: string }[] = [
  { value: "name_asc", labelKey: "sort-name-asc" },
  { value: "name_desc", labelKey: "sort-name-desc" },
  { value: "newest", labelKey: "sort-newest" },
  { value: "oldest", labelKey: "sort-oldest" },
]

interface CategorySortSelectProps {
  labels: Record<string, string>
}

export default function CategorySortSelect({ labels }: CategorySortSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sortOptions = SORT_OPTIONS_KEYS.map((opt) => ({
    value: opt.value,
    label: labels[opt.labelKey] || opt.labelKey,
  }))

  const currentSort = (searchParams.get("sort") as CategorySortOption) || "name_asc"
  const currentOption = sortOptions.find((o) => o.value === currentSort) ?? sortOptions[0]

  const handleChange = (option: { value: CategorySortOption; label: string }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (option.value === "name_asc") {
      params.delete("sort")
    } else {
      params.set("sort", option.value)
    }

    // Reset page when sort changes
    params.delete("page")

    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : window.location.pathname)
  }

  return (
    <Listbox value={currentOption} onChange={handleChange}>
      <div className="relative">
        <ListboxButton className="flex items-center justify-center gap-x-2 h-[56px] border border-gray-300 px-5 text-sm text-gray-700 hover:border-gray-400 transition-colors">
          <span>{currentOption.label}</span>
          <ChevronDown size="14" />
        </ListboxButton>
        <ListboxOptions className="absolute right-0 mt-1 z-50 bg-white border border-gray-300 shadow-md min-w-[200px]">
          {sortOptions.map((option) => (
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
