"use client"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import { useCanSeePrices } from "@lib/context/customer-context"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  "data-testid"?: string
}

const sortOptions = [
  {
    value: "created_at",
    label: "Latest Arrivals",
  },
  {
    value: "price_asc",
    label: "Price: Low -> High",
  },
  {
    value: "price_desc",
    label: "Price: High -> Low",
  },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const canSeePrices = useCanSeePrices()

  const handleChange = (value: SortOptions) => {
    setQueryParams("sortBy", value)
  }

  // Offering "sort by price" to an account that cannot see prices is
  // meaningless, so the two price options are dropped entirely.
  const visibleOptions = canSeePrices
    ? sortOptions
    : sortOptions.filter((option) => !option.value.startsWith("price_"))

  return (
    <FilterRadioGroup
      title="Sort by"
      items={visibleOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
