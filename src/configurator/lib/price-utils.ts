// Ported from furnibay-frontend-shop/src/utilityFunctions/priceUtils/index.ts
// Pure functions — all dependencies passed as parameters.

import type {
  SelectedFabricState,
  SelectedComponent,
  PriceFabricCategory,
} from "./types"

/**
 * Format a price according to the shop currency.
 */
export const priceFormatter = (
  price: number | null | undefined,
  currency: string = "EUR"
): string => {
  if (price == null || !Number.isFinite(price)) {
    return ""
  }

  let locale = "lt-LT"
  if (currency === "PLN") {
    locale = "pl-PL"
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  })

  return formatter.format(price)
}

/**
 * Look up the price for a selected fabric in a list of price-fabric-categories.
 * If combination fabrics are selected, finds the highest-priced category matching any of them.
 */
export const getPriceFromPriceCategories = (
  selectedFabric: SelectedFabricState,
  priceFabricCategories: PriceFabricCategory[]
): number | null => {
  let matchingCategories: PriceFabricCategory[]

  if (selectedFabric.combinationFabrics) {
    // Get all group numbers from combination fabrics
    const groupNumbers = Object.values(selectedFabric.combinationFabrics).map(
      (option) => option.fabricGroupObject?.form_price_fabric_category?.group_number
    )
    const uniqueGroupNumbers = groupNumbers.filter(
      (value, index, self) => self.indexOf(value) === index
    )
    matchingCategories = priceFabricCategories?.filter((category) =>
      uniqueGroupNumbers.includes(category.fabrice_price_category.group_number)
    ) ?? []
  } else {
    matchingCategories = priceFabricCategories.filter(
      (category) =>
        category.fabrice_price_category.group_number ===
        selectedFabric.fabricGroupObject?.form_price_fabric_category?.group_number
    )
  }

  if (!matchingCategories || matchingCategories.length === 0) return null

  // Return the highest price among matching categories
  const highest = matchingCategories.reduce((prev, current) =>
    prev && prev.price > current.price ? prev : current
  )

  return highest?.price ?? null
}

/**
 * Calculate the total price for an advanced product based on:
 * - Sofa module prices (from form_price_fabric_category)
 * - Base price (for non-fabric products like tables)
 * - Additional component prices (extra_price or price_fabric_category)
 */
export const getAdvancedProductPrice = (
  product: {
    advanced_product?: {
      advanced_product_price_fabric_category?: PriceFabricCategory[]
      base_prices?: { price: number; price_listId: number }[]
    }
  },
  sofaCombinations: any[][],
  selectedAdditionalComponents: SelectedComponent[],
  selectedFabric: SelectedFabricState,
  priceListId: number = 1
): number => {
  // 1) Sum prices of all sofa modules
  let totalSofaModulesPrice = 0
  if (sofaCombinations.length > 0) {
    for (const combination of sofaCombinations) {
      for (const shape of combination) {
        const item = shape.attrs?.originalSofaForm
        if (item) {
          const price = getPriceFromPriceCategories(
            selectedFabric,
            item.form_price_fabric_category ?? []
          )
          totalSofaModulesPrice += price ?? 0
        }
      }
    }
  }

  // 2) Calculate base/fabric price + component extras
  const priceCategories =
    product?.advanced_product?.advanced_product_price_fabric_category?.filter(
      (cat) => cat.price_listId === priceListId
    ) ?? []

  const fabricGroup = selectedFabric?.fabricGroupObject
  let totalPrice = 0

  if (fabricGroup) {
    // Fabric-based product: look up base price by fabric category
    totalPrice =
      getPriceFromPriceCategories(selectedFabric, priceCategories) ?? 0

    // Add additional component prices
    for (const component of selectedAdditionalComponents) {
      if (component.price_fabric_category && component.price_fabric_category.length > 0) {
        const price = getPriceFromPriceCategories(
          selectedFabric,
          component.price_fabric_category
        )
        totalPrice += price ?? 0
      } else if (component.extra_price) {
        totalPrice += component.extra_price
      }
    }
  } else {
    // Non-fabric product (tables, lights): use base price
    const basePrice =
      product?.advanced_product?.base_prices?.find(
        (p) => p.price_listId === priceListId
      )?.price ?? 0

    totalPrice = basePrice

    for (const component of selectedAdditionalComponents) {
      if (component.extra_price) {
        totalPrice += component.extra_price
      }
    }
  }

  return totalPrice + totalSofaModulesPrice
}

/**
 * Calculate the discounted price given a percentage discount.
 */
export const getDiscountedPrice = (
  price: number,
  percentageDiscount: number,
  currentPricesWithVat: boolean = false,
  vatPercentage: number = 21
): number => {
  if (currentPricesWithVat) {
    const priceWithoutVat = price / ((100 + vatPercentage) / 100)
    const discountedWithoutVat = (priceWithoutVat * (100 - percentageDiscount)) / 100
    return discountedWithoutVat * ((100 + vatPercentage) / 100)
  }
  return (price * (100 - percentageDiscount)) / 100
}

/**
 * Check if a discount is currently valid.
 */
export const isDiscountValid = (
  discount: { active: boolean; startDate: string; expiryDate: string } | null
): boolean => {
  if (!discount || !discount.active) return false
  const now = new Date()
  const start = new Date(discount.startDate)
  const end = new Date(discount.expiryDate)
  return now >= start && now <= end
}
