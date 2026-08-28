// =============================================
// Configurator TypeScript Types
// =============================================

// --- Product data from GraphQL configurator query ---

/**
 * Matches the shape returned by the GET_CONFIGURATOR_DATA GraphQL query
 * (findUniqueProductContainer response).
 */
export interface ConfiguratorProductData {
  id: number
  type: string
  discount: ProductDiscount | null
  advanced_product: {
    id: number
    advanced_product_type: string // 'SOFA' | 'TABLE' | etc.
    base_price?: number
    base_prices: BasePrice[]
    price_from?: number
    advanced_product_profiles: { name: string; description: string | null; language: string }[]
    images: { id: number; src: string; src_md: string | null; src_xs: string | null; display_order: number }[]
    product_details: { id: number; meta_content: any | null } | null
    sofa_forms: SofaForm[]
    fabricCombinations: FabricCombination[]
    advanced_product_price_fabric_category: PriceFabricCategory[]
    additional_component_to_advanced_product: any[]
    dimensions: Record<string, any> | null
  } | null
  manufacturer: {
    id: number
    additional_component_groups: ComponentGroup[]
    fabric_price_category: ManufacturerFabricPriceCategory[]
    currency?: string
  } | null
}

export interface SofaForm {
  id: number
  code: string
  name: string
  type: string
  dimensions: SofaDimensions
  form_price_fabric_category: FormPriceFabricCategory[]
  metadata: SofaFormMetadata | null
  enabled_connectors: string[] | null
  images: { src: string; src_md: string | null }[]
  package_dimensions: any | null
}

export interface SofaFormExtended extends SofaForm {
  originalDimension: { width: number; height: number }
}

export interface SofaDimensions {
  width: number
  height: number
  length?: number
  seat_height?: number
  armrest_width?: number
  backrest_width?: number
  mattress_width?: number
  mattress_length?: number
  corner_part_length?: number
  corner_radius?: number
  composition?: string
  angle?: number
  extendable_part_length?: number
  number_of_big_pillows?: number
  number_of_small_pillows?: number
  spread_of_big_pillows?: number
  spread_of_small_pillows?: number
  size_of_big_pillow?: number
  size_of_pillow?: number
  seat_sections?: number
  backrest_sections?: number
  extension_type?: string
  backrest_type?: string
  covered_side?: string
}

export interface SofaFormMetadata {
  armrestsConditions?: string[]
  legs?: string[]
  armrests_legs_map?: Record<string, string[]>
  additionalLegs?: boolean
  [key: string]: any
}

export interface FormPriceFabricCategory {
  price: number
  price_listId: number
  fabrice_price_category: {
    group_number: number
  }
}

// --- Fabric types ---

export interface FabricCombination {
  id: number
  code: string
  name: string | null
  visible: boolean
  image: { src: string; src_md: string | null } | null
  fabricCombinationOptions: FabricCombinationOption[]
  fabricCombinationProfiles?: { name: string; description?: string | null; language: string }[]
}

export interface FabricCombinationOption {
  id: number
  code: string
  name: string | null
  profiles: { name: string; language: string }[]
}

export interface ManufacturerFabricPriceCategory {
  id: number
  group_number: number
  fabric_groups: FabricGroup[]
}

export interface FabricGroup {
  id: number
  name: string
  code: string
  fabrics: Fabric[]
  fabric_group_profiles: { name: string; language: string }[]
  fabric_palettes?: FabricGroupPalette[]
}

export interface FabricGroupWithPrice extends FabricGroup {
  priceMultiplier: number
  form_price_fabric_category: ManufacturerFabricPriceCategory
}

export interface Fabric {
  id: number
  code: string
  color_name: string | null
  order: number
  image: { src: string; src_md: string | null; src_xs: string | null } | null
}

export interface FabricGroupPalette {
  name: string | null
  fabric_palette: {
    id: number
  }
}

// --- Additional component types ---

export interface ComponentGroup {
  id?: number
  code: string
  order: number
  nameOverride?: React.ReactNode | null
  ui_type?: string | null
  use_fabric_prices_for_components?: boolean
  hide_components_without_price?: boolean
  enable_custom_dimensions_for_components?: boolean
  enabled_dimensions_in_group?: string[] | null
  additional_component_group_profiles: { name: string; description?: string | null; language: string }[]
  additional_components: AdditionalComponent[]
}

export interface AdditionalComponent {
  id: number
  code: string
  isDefault?: boolean
  groupCode?: string
  groupNameOverride?: string
  moduleId?: string
  additionalComponentGroupId?: number
  is_wrapper?: boolean
  component_sku?: string | null
  conditions?: {
    onlyWithComponents?: string[]
    onlyWithComponentsGroup?: string
  } | null
  dimensions: Record<string, any> | null
  image: { src: string; src_md: string | null; src_xs: string | null } | null
  additional_component_profiles: { name: string; material_name?: string | null; description: string | null; language: string }[]
  price_fabric_category: ComponentPriceFabricCategory[]
  extra_price: number | null
  extra_prices: { price: number; price_listId?: number }[]
  color?: { id: number; hex: string; background: string | null } | null
  linked_components_source?: LinkedComponent[] | null
  metadata?: Record<string, any> | null
  package_dimensions?: { volume: number }[] | null
}

export interface ComponentPriceFabricCategory {
  price: number
  price_listId: number
  fabrice_price_category: {
    group_number: number
  }
}

export interface SelectedComponent extends AdditionalComponent {
  groupCode: string
  groupNameOverride?: string
  moduleId?: string
}

// --- Pricing types ---

export interface PriceFabricCategory {
  price: number
  price_listId: number
  fabrice_price_category: {
    group_number: number
  }
}

export interface BasePrice {
  price_from: number
  price: number
  price_listId: number
}

export interface ProductDiscount {
  id: number
  discount: number
  active: boolean
  startDate: string
  expiryDate: string
}

// --- State types ---

export interface SelectedFabricState {
  fabricGroupObject: FabricGroupWithPrice | null
  fabricObject: Fabric | null
  combinationFabrics: Record<string, {
    fabricGroupObject: FabricGroupWithPrice
    fabricObject: Fabric
    option: FabricCombinationOption
  }> | null
}

export interface SelectedFabricCombinationState {
  fabricCombination: FabricCombination | null
}

export interface LinkedComponent {
  id: number
  link_type: string
  display_order: number
  target_component: {
    id: number
    code: string | null
    component_sku?: string | null
    image: { src_thumbnail?: string; src_md: string | null } | null
    additional_component_profiles: { id: number; name: string; description: string | null; language: string }[]
  }
}

export type StepId = 'sofa-modules' | 'fabric' | 'armrest-legs' | 'design' | 'threads' | 'logo' | 'other'

export interface StepDefinition {
  id: StepId
  label: string
  groups: ComponentGroup[]
}

// --- Sofa set measurement (rotation-aware, from rendered drawing geometry) ---

/**
 * Width/depth of a connected sofa combination ("set") as measured from the
 * rendered Konva drawing (see `measureGroupOfGroups` in
 * SofaDrawingElements/utils.tsx). This is the source of truth for display
 * and cart persistence — unlike naively summing each module's raw
 * `dimensions.width`/`length`, it accounts for modules rotated onto a
 * different axis (e.g. an arm rotated 90° onto a corner's other side).
 */
export type SetMeasurement = {
  width: number
  depth: number
}

/**
 * A measurement is only trustworthy when BOTH dimensions are known — a
 * group whose children haven't finished rendering can produce a finite but
 * partially/fully-zeroed measurement (e.g. `{width: 300, depth: 0}`), and
 * displaying/persisting one axis from that without the other would be
 * misleading. Guard jointly, not per-field, so every consumer (summary
 * table, add-to-cart, order/cart detail) agrees on when to fall back to the
 * naive per-module sum instead.
 */
export function isValidMeasurement(
  m: SetMeasurement | null | undefined
): m is SetMeasurement {
  return !!m && m.width > 0 && m.depth > 0
}

// --- Cart types ---

export interface ConfiguredCartItemPayload {
  product_container_id: number
  name: string
  price: number
  quantity: number
  image: string
  reference: string | null
  volume: number
  advanced_product_data: {
    advanced_product_type: string
    selected_fabric: SelectedFabricState
    selected_sofa_combinations: string // serialized JSON
    selected_additional_components: SelectedComponent[]
    additional_component_groups: { code: string; id?: number; profiles: { name: string; language: string }[] }[]
    selected_fabric_combination: SelectedFabricCombinationState | null
  }
  integration_configuration: object | null
}
