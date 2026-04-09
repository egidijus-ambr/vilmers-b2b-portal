import { Customer } from "@lib/furnisystems-sdk/modules/customer/types"

export function getCustomerMarket(customer: { additional_components?: Customer["additional_components"] } | null): string | null {
  if (!customer?.additional_components) return null

  const marketComponent = customer.additional_components.find(
    (ac) => ac.additionalComponent?.additional_component_group?.code === "market"
  )

  return marketComponent?.additionalComponent?.code?.toUpperCase() ?? null
}
