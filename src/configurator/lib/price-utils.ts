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
    // A price <= 0 is "no price" (the admin price table renders 0 as "-").
    if (category.price == null || category.price <= 0) continue
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

// Re-declared (not imported from ./vilmers) because vilmers.ts imports this
// file; keep in sync with MODEL_CODE / MODEL_CODE_OTHER there.
const MAIN_GROUP_CODE_OTHER = "model-other"
const MAIN_GROUP_CODE_DEFAULT = "model"

/**
 * Price of one additional component for the given fabric categories, or null
 * when it has no price ("no price" is never 0).
 * - With fabric categories (`groupNumbers`) and fabric-category rows: best
 *   matching row.
 * - Otherwise the (price-list resolved) flat `extra_price` when > 0.
 * Single lookup shared by the total, the main-component check and the fabric
 * category availability.
 */
export const getComponentPrice = (
  component: {
    price_fabric_category?: PriceFabricCategory[] | null
    extra_price?: number | null
  },
  groupNumbers: number[]
): number | null => {
  if (groupNumbers.length > 0 && (component.price_fabric_category?.length ?? 0) > 0) {
    return getPriceForGroupNumbers(groupNumbers, component.price_fabric_category)
  }
  return component.extra_price != null && component.extra_price > 0
    ? component.extra_price
    : null
}

/**
 * Main component group of a component-priced product, or null.
 * Products with sofa modules (and every SOFA) are priced by their modules;
 * all others are priced through their type's main group: `model-other` for
 * OTHER, `model` for the rest (e.g. beds, OTHER_WITH_FABRICS). Mirrors the
 * type-aware rule in the SDK's buildWhereFilter (listing admission).
 */
export const getMainGroupCode = (
  advancedProduct:
    | { advanced_product_type?: string; sofa_forms?: unknown[] }
    | null
    | undefined
): string | null => {
  if (!advancedProduct) return null
  if (advancedProduct.advanced_product_type === "SOFA") return null
  if ((advancedProduct.sofa_forms?.length ?? 0) > 0) return null
  return advancedProduct.advanced_product_type === "OTHER"
    ? MAIN_GROUP_CODE_OTHER
    : MAIN_GROUP_CODE_DEFAULT
}

export type MainGroupInfo = {
  code: string
  /** Enabled options of the main group on the current price list (no "0" placeholder). */
  options: SelectedComponent[]
  /** Currently selected option, if any. */
  selected: SelectedComponent | null
  /** True when the group is priced per fabric category (some option has category rows). */
  fabricPriced: boolean
}

export const resolveMainGroup = (
  advancedProduct:
    | { advanced_product_type?: string; sofa_forms?: unknown[] }
    | null
    | undefined,
  groups: { code: string; additional_components?: any[] }[],
  selectedComponents: SelectedComponent[]
): MainGroupInfo | null => {
  const code = getMainGroupCode(advancedProduct)
  if (!code) return null
  const group = groups.find((g) => g.code === code)
  const options = ((group?.additional_components ?? []) as SelectedComponent[]).filter(
    (c) => c.code !== "0"
  )
  if (options.length === 0) return null
  const selected =
    selectedComponents.find((c) => c.groupCode === code && c.code !== "0") ?? null
  const fabricPriced = options.some((c) => (c.price_fabric_category?.length ?? 0) > 0)
  return { code, options, selected, fabricPriced }
}

export type AdvancedProductPriceResult = {
  /** null when the price cannot be computed (see unpriced* / baseMissing). */
  total: number | null
  /** Ids of canvas modules that have no price for the selected fabric category. */
  unpricedModuleIds: string[]
  /** The selected main-group option (e.g. bed Size) has no price for the selected fabric category. */
  mainComponentMissing: boolean
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
 * - Base price (when the product has one)
 * - Additional component prices (fabric-category price or extra_price)
 *
 * A missing price is never treated as 0: if any module on the canvas, or the
 * selected main-group component (`mainGroupCode`, e.g. a bed's Size), has no
 * price, `total` is null and the culprit is reported. Other components keep
 * contributing 0 when unpriced (many groups intentionally allow unpriced picks).
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
  mainGroupCode: string | null = null
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
      return { total: null, unpricedModuleIds: [], mainComponentMissing: false }
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

  // 2) Base/fabric price (if the product has one) + component prices
  const priceCategories =
    product?.advanced_product?.advanced_product_price_fabric_category?.filter(
      (cat) => cat.price_listId === priceListId
    ) ?? []

  let totalPrice = 0

  if (fabricGroup) {
    totalPrice = getPriceFromPriceCategories(selectedFabric, priceCategories) ?? 0
  } else {
    // Non-fabric product (tables, lights): use base price if any
    totalPrice =
      product?.advanced_product?.base_prices?.find((p) => p.price_listId === priceListId)
        ?.price ?? 0
  }

  // Without a fabric, `groupNumbers` is empty and only extra_price counts.
  let mainComponentMissing = false
  for (const component of selectedAdditionalComponents) {
    const price = getComponentPrice(component, groupNumbers)
    if (price == null && mainGroupCode && component.groupCode === mainGroupCode && component.code !== "0") {
      mainComponentMissing = true
    }
    totalPrice += price ?? 0
  }

  const unpriced = unpricedModuleIds.length > 0 || mainComponentMissing
  return {
    total: unpriced ? null : totalPrice + totalSofaModulesPrice,
    unpricedModuleIds,
    mainComponentMissing,
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
  mainGroupCode: string | null = null
): number | null =>
  computeAdvancedProductPrice(
    product,
    sofaCombinations,
    selectedAdditionalComponents,
    selectedFabric,
    priceListId,
    mainGroupCode
  ).total

export type FabricCategoryAvailability = "available" | "disabled" | "hidden"

/**
 * Availability of a fabric price category (`candidate`). Uses the exact same
 * lookups as computeAdvancedProductPrice so the selector and total cannot
 * disagree.
 *
 * Module products (`sofaForms` = the product's enabled modules, already
 * filtered to the customer's price list):
 * - hidden: no module is priced in the category.
 * - disabled: some module is priced in it, but at least one module currently
 *   on the canvas is not. An empty canvas is therefore never "disabled".
 *
 * Component-priced products (`mainGroup`, e.g. beds priced by Size):
 * - hidden: no option of the main group is priced in the category.
 * - disabled: some option is priced, but the selected one is not.
 * - available when nothing is selected yet (the required-group check blocks
 *   add-to-cart) or when the main group is not priced per fabric category.
 *
 * `otherGroupNumbers` are the categories of the *other* combination options
 * (combination mode takes the best price across the selected categories).
 */
export const getFabricCategoryAvailability = ({
  candidate,
  otherGroupNumbers = [],
  sofaCombinations,
  sofaForms,
  mainGroup = null,
}: {
  candidate: number
  otherGroupNumbers?: number[]
  sofaCombinations: any[][]
  sofaForms: { form_price_fabric_category?: PriceFabricCategory[] }[]
  mainGroup?: MainGroupInfo | null
}): FabricCategoryAvailability => {
  const groupNumbers = [...otherGroupNumbers, candidate]

  if (sofaForms.length > 0) {
    const anyPriced = sofaForms.some(
      (f) => getPriceForGroupNumbers(groupNumbers, f.form_price_fabric_category) != null
    )
    if (!anyPriced) return "hidden"
  }

  if (mainGroup?.fabricPriced) {
    const anyPriced = mainGroup.options.some((o) => getComponentPrice(o, groupNumbers) != null)
    if (!anyPriced) return "hidden"
    if (mainGroup.selected && getComponentPrice(mainGroup.selected, groupNumbers) == null) {
      return "disabled"
    }
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
