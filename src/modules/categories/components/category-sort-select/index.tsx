"use client"

import { useRouter, useSearchParams } from "next/navigation"
import SortSelect from "@modules/common/components/sort-select"
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

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === "name_asc") {
      params.delete("sort")
    } else {
      params.set("sort", value)
    }

    // Reset page when sort changes
    params.delete("page")

    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : window.location.pathname)
  }

  return (
    <SortSelect
      options={sortOptions}
      value={currentSort}
      onChange={handleChange}
    />
  )
}
