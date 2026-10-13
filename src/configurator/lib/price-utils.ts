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
 * Group numbers (price categories) implied by a fabric selection.
 * Combination mode: the unique categories of all option fabrics.
 */
export const getSelectedGroupNumbers = (
  selectedFabric: SelectedFabricState
): number[] => {
  if (selectedFabric.combinationFabrics) {
    const nums = Object.values(selectedFabric.combinationFabrics)
      .map((o) => o.fabricGroupObject?.form_price_fabric_category?.group_number)
      .filter((n): n is number => n != null)
    return nums.filter((v, i, self) => self.indexOf(v) === i)
  }
  const n = selectedFabric.fabricGroupObject?.form_price_fabric_category?.group_number
  return n != null ? [n] : []
}

/**
 * Core lookup: highest price among the rows whose category is in `groupNumbers`.
 * Returns null when no row matches ("no price" — distinct from a price of 0).
 * Single source of truth shared by totals, drawers and the fabric selector.
 */
export const getPriceForGroupNumbers = (
  groupNumbers: number[],
  priceFabricCategories: PriceFabricCategory[] | null | undefined
): number | null => {
  let best: number | null = null
  for (const category of priceFabricCategories ?? []) {
    if (category.price == null) continue
    if (!groupNumbers.includes(category.fabrice_price_category.group_number)) continue
    if (best == null || category.price > best) best = category.price
  }
  return best
}

/**
 * Look up the price for a selected fabric in a list of price-fabric-categories.
 * If combination fabrics are selected, finds the highest-priced category matching any of them.
 * Returns null when there is no price (NOT 0).
 */
export const getPriceFromPriceCategories = (
  selectedFabric: SelectedFabricState,
  priceFabricCategories: PriceFabricCategory[]
): number | null =>
  getPriceForGroupNumbers(
    getSelectedGroupNumbers(selectedFabric),
    priceFabricCategories
  )

/**
 * Products without sofa modules (e.g. OTHER_WITH_FABRICS, tables) are priced by
 * their own price, so a missing one must block rather than become 0.
 */
export const productRequiresBasePrice = (
  advancedProduct:
    | { advanced_product_type?: string; sofa_forms?: unknown[] }
    | null
    | undefined
): boolean =>
  advancedProduct?.advanced_product_type !== "SOFA" &&
  (advancedProduct?.sofa_forms?.length ?? 0) === 0

export type AdvancedProductPriceResult = {
  /** null when the price cannot be computed (see unpriced* / baseMissing). */
  total: number | null
  /** Ids of canvas modules that have no price for the selected fabric category. */
  unpricedModuleIds: string[]
  /** Fabric product whose own (non-module) price is missing for the fabric category. */
  baseMissing: boolean
}

const moduleKey = (shape: any, index: number): string =>
  String(shape?.attrs?.id ?? shape?.attrs?.name ?? `module-${index}`)

/**
 * Modules on the canvas that have no price for the given fabric categories.
 */
export const getUnpricedModuleIds = (
  groupNumbers: number[],
  sofaCombinations: any[][]
): string[] => {
  const ids: string[] = []
  let i = 0
  for (const combination of sofaCombinations) {
    for (const shape of combination) {
      const item = shape.attrs?.originalSofaForm
      if (item) {
        if (getPriceForGroupNumbers(groupNumbers, item.form_price_fabric_category) == null) {
          ids.push(moduleKey(shape, i))
        }
      }
      i++
    }
  }
  return ids
}

/**
 * Calculate the total price for an advanced product based on:
 * - Sofa module prices (from form_price_fabric_category)
 * - Base price (for non-fabric products like tables)
 * - Additional component prices (extra_price or price_fabric_category)
 *
 * A missing price is never treated as 0: if any module (or, when
 * `requireBasePrice`, the product's own fabric-category price) has no price,
 * `total` is null and the offending modules are listed.
 * Components keep contributing 0 when they have no price for the fabric
 * (unchanged behaviour; many component groups intentionally allow unpriced picks).
 */
export const computeAdvancedProductPrice = (
  product: {
    advanced_product?: {
      advanced_product_price_fabric_category?: PriceFabricCategory[]
      base_prices?: { price: number; price_listId: number }[]
    }
  },
  sofaCombinations: any[][],
  selectedAdditionalComponents: SelectedComponent[],
  selectedFabric: SelectedFabricState,
  priceListId: number = 1,
  requireBasePrice: boolean = false
): AdvancedProductPriceResult => {
  const fabricGroup = selectedFabric?.fabricGroupObject
  const groupNumbers = getSelectedGroupNumbers(selectedFabric)
  const hasModules = sofaCombinations.some((c) => c.some((s) => s.attrs?.originalSofaForm))

  // 1) Sofa modules
  let totalSofaModulesPrice = 0
  let unpricedModuleIds: string[] = []
  if (hasModules) {
    if (!fabricGroup) {
      // Fabric not chosen yet: price is simply not available (not "unpriced").
      return { total: null, unpricedModuleIds: [], baseMissing: false }
    }
    unpricedModuleIds = getUnpricedModuleIds(groupNumbers, sofaCombinations)
    for (const combination of sofaCombinations) {
      for (const shape of combination) {
        const item = shape.attrs?.originalSofaForm
        if (item) {
          totalSofaModulesPrice +=
            getPriceForGroupNumbers(groupNumbers, item.form_price_fabric_category) ?? 0
        }
      }
    }
  }

  // 2) Base/fabric price + component extras
  const priceCategories =
    product?.advanced_product?.advanced_product_price_fabric_category?.filter(
      (cat) => cat.price_listId === priceListId
    ) ?? []

  let totalPrice = 0
  let baseMissing = false

  if (fabricGroup) {
    const base = getPriceFromPriceCategories(selectedFabric, priceCategories)
    if (base == null) {
      baseMissing = requireBasePrice
    } else {
      totalPrice = base
    }

    for (const component of selectedAdditionalComponents) {
      if (component.price_fabric_category && component.price_fabric_category.length > 0) {
        totalPrice +=
          getPriceFromPriceCategories(selectedFabric, component.price_fabric_category) ?? 0
      } else if (component.extra_price) {
        totalPrice += component.extra_price
      }
    }
  } else {
    // Non-fabric product (tables, lights): use base price
    const basePrice = product?.advanced_product?.base_prices?.find(
      (p) => p.price_listId === priceListId
    )?.price

    if (basePrice == null) {
      baseMissing = requireBasePrice
    } else {
      totalPrice = basePrice
    }

    for (const component of selectedAdditionalComponents) {
      if (component.extra_price) {
        totalPrice += component.extra_price
      }
    }
  }

  const unpriced = unpricedModuleIds.length > 0 || baseMissing
  return {
    total: unpriced ? null : totalPrice + totalSofaModulesPrice,
    unpricedModuleIds,
    baseMissing,
  }
}

/**
 * Backwards-compatible wrapper: total, or null when anything is unpriced.
 */
export const getAdvancedProductPrice = (
  product: Parameters<typeof computeAdvancedProductPrice>[0],
  sofaCombinations: any[][],
  selectedAdditionalComponents: SelectedComponent[],
  selectedFabric: SelectedFabricState,
  priceListId: number = 1,
  requireBasePrice: boolean = false
): number | null =>
  computeAdvancedProductPrice(
    product,
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
    priceListId,
    requireBasePrice
  ).total

export type FabricCategoryAvailability = "available" | "disabled" | "hidden"

/**
 * Availability of a fabric price category (`candidate`). Uses the exact same
 * lookups as computeAdvancedProductPrice so the selector and total cannot
 * disagree. `sofaForms` are the product's enabled modules, already filtered to
 * the customer's price list by the configurator query.
 *
 * - hidden: no module of the product is priced in the category (products
 *   without modules that need a base price: that price is missing).
 * - disabled: some module is priced in it, but at least one module currently
 *   on the canvas is not.
 * - available: otherwise. An empty canvas is therefore never "disabled".
 *
 * `otherGroupNumbers` are the categories of the *other* combination options
 * (combination mode takes the best price across the selected categories).
 */
export const getFabricCategoryAvailability = ({
  candidate,
  otherGroupNumbers = [],
  sofaCombinations,
  sofaForms,
  productPriceCategories,
  requireBasePrice,
}: {
  candidate: number
  otherGroupNumbers?: number[]
  sofaCombinations: any[][]
  sofaForms: { form_price_fabric_category?: PriceFabricCategory[] }[]
  productPriceCategories: PriceFabricCategory[]
  requireBasePrice: boolean
}): FabricCategoryAvailability => {
  const groupNumbers = [...otherGroupNumbers, candidate]

  if (sofaForms.length > 0) {
    const anyPriced = sofaForms.some(
      (f) => getPriceForGroupNumbers(groupNumbers, f.form_price_fabric_category) != null
    )
    if (!anyPriced) return "hidden"
  }

  if (requireBasePrice) {
    if (getPriceForGroupNumbers(groupNumbers, productPriceCategories) == null) return "hidden"
  }

  const hasModules = sofaCombinations.some((c) => c.some((s) => s.attrs?.originalSofaForm))
  if (hasModules && getUnpricedModuleIds(groupNumbers, sofaCombinations).length > 0) {
    return "disabled"
  }
  return "available"
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

export type DiscountResult = {
  regular: number
  discounted: number
  hasDiscount: boolean
}

/**
 * Apply a customer-level percentage discount to a price.
 * Null/0/undefined pct is treated as "no discount".
 * Out-of-range values are clamped to [0, 100] with a dev warning.
 */
export const applyDiscount = (
  regular: number,
  pct: number | null | undefined
): DiscountResult => {
  if (pct == null || pct === 0) {
    return { regular, discounted: regular, hasDiscount: false }
  }
  let safePct = pct
  if (pct < 0 || pct > 100) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[applyDiscount] pct ${pct} out of range [0,100], clamping`
      )
    }
    safePct = Math.max(0, Math.min(100, pct))
  }
  const raw = regular * (1 - safePct / 100)
  const discounted = Math.round(raw * 100) / 100
  return { regular, discounted, hasDiscount: discounted < regular }
}
