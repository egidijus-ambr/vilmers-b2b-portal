import { BaseEntity, Address } from "../../types/common"

export interface FabricPalette {
  id: string
}

export interface FabricImage {
  id: number
  src: string
  src_thumbnail?: string
  src_md?: string
}

export interface FabricDetail {
  id: number
  code: string
  color_name?: string
  order: number
  image: FabricImage
}

export interface FabricGroupProfileDetail {
  id: number
  name: string
  language: string
  description?: string
}

export interface FabricFeatureProfileDetail {
  name: string
  language: string
}

export interface FabricFeatureDetail {
  id: number
  code?: string
  photo?: { id: number; src: string }
  fabric_feature_profiles: FabricFeatureProfileDetail[]
  fabric_feature_group?: {
    id: number
    code?: string
    fabric_feature_group_profiles: FabricFeatureProfileDetail[]
  } | null
}

export interface FabricGroupToFabricFeatureDetail {
  fabric_feature: FabricFeatureDetail
}

export interface FabricGroupDetail {
  id: number
  code?: string
  fabrics: FabricDetail[]
  fabric_group_profiles: FabricGroupProfileDetail[]
  fabric_features?: FabricGroupToFabricFeatureDetail[]
  fabric_price_category?: { id: number; group_number: number }[]
}

export interface FabricGroupToPaletteEntry {
  id: number
  name?: string
  fabric_group: FabricGroupDetail
}

export interface FabricPaletteDetail {
  id: number
  name: string
  code?: string
  fabric_groups: FabricGroupToPaletteEntry[]
}

export interface ManagerImage {
  src_md: string
  src: string
}

export interface Manager {
  name: string
  surname: string
  email: string
  role?: string
  default_phone_number?: string
  image?: ManagerImage
  spoken_languages?: string[]
}

export interface CustomerManager {
  id: string
  manager: Manager
}

export interface Customer {
  id?: string | number
  created_at?: string | Date
  updated_at?: string | Date
  deleted_at?: string | Date | null
  email: string
  full_name?: string
  phone?: string | null
  has_account?: boolean
  addresses?: any[]
  orders?: Order[]
  b2b_company_name?: string
  account_code?: string
  price_listId?: string
  b2b_customer_discount?: number | null
  group_price_listId?: string
  tags?: { id: number }[]
  fabric_palettes?: FabricPalette[]
  customer_group?: {
    fabric_palettes?: FabricPalette[]
  }
  managers?: CustomerManager[]
  spoken_languages?: string[]
  is_configurator_enabled?: boolean
  is_claims_enabled?: boolean
  role?: string
  name?: string
  surname?: string
  customer_account?: {
    name: string
    email: string
    shop: string
    id: string
  }
  b2b_company_address?: {
    country: string
  }
  additional_components?: {
    additionalComponent: {
      code?: string
      additional_component_group?: { code?: string }
    }
  }[]
}

export interface Order extends BaseEntity {
  display_id?: string
  status?: string
  order_status: string
  total?: number
  total_price: number
  currency_code?: string
  order_code: string
  order_number: string
  invoice_code?: string
  order_type?: string
  order_external_code?: string
  order_items_count?: number
  confirmed_delivery_date?: string
  metadata?: Record<string, any>
  total_price_confirmed?: number
  items?: OrderItem[]
  shipping_address?: Address
  billing_address?: Address
  purchased_subAccount?: {
    name: string
  }
  purchased_by?: {
    name: string
    account_code: string
  }
  order_item_references?: string[]
}

export interface OrderDetailAddress {
  id?: number
  phone_number?: string
  country?: string
  city?: string
  postal_code?: string
  state_region?: string
  address_1?: string
  address_2?: string
}

export interface OrderDetailPaymentMethod {
  id?: number
  payment_method_profiles?: {
    title: string
    language: string
  }[]
}

export interface OrderDetailShippingMethod {
  id?: number
  shipping_method_profiles?: {
    title: string
    language: string
  }[]
}

export interface OrderDetailImage {
  src: string
  src_xs?: string
  src_thumbnail?: string
}

export interface OrderDetailProductProfile {
  name: string
  language: string
}

export interface CartItemFabricDetail {
  id: string
  fabric?: {
    id: string
    code?: string
    color_name?: string
    image?: {
      src: string
      src_thumbnail?: string
    }
  }
  fabric_group?: {
    id: string
    code?: string
    type?: string
    fabric_group_profiles?: {
      name: string
      language: string
    }[]
  }
  combination_option?: {
    fabricCombinationOptionProfiles?: {
      name: string
      language: string
    }[]
  }
}

export interface AdvancedProductDimensions {
  width?: number | null
  height?: number | null
  length?: number | null
  seat_height?: number | null
  seat_width?: number | null
  seat_depth?: number | null
  headboard_height?: number | null
  headboard_width?: number | null
  mattress_width?: number | null
  mattress_length?: number | null
  table_extended_lengh?: number | null
  table_top_thickness?: number | null
  table_leg_width?: number | null
  shade_height?: number | null
  shade_radius?: number | null
}

export interface SofaFormDimensions {
  width?: number
  height?: number
  length?: number
  armrest_width?: number
}

export interface SofaFormDetail {
  id: string
  name?: string
  type?: string
  code?: string
  dimensions?: SofaFormDimensions
}

export interface SofaConfigurationPart {
  moduleName: string
  shapeType: string
  moduleCode: string
  price: number
  setId: string
  fabrics: {
    position: string
    fabricCode?: string
  }[]
}

export interface AdditionalComponentDetail {
  id: number
  additionalComponentGroupId: number
  code?: string
  additional_component_profiles?: {
    name: string
    material_name?: string
    language: string
  }[]
  image?: {
    src: string
    src_thumbnail?: string
  }
  color?: {
    id: number
    hex?: string
    background?: string
  }
  additional_component_group?: {
    id: number
    code?: string
    additional_component_group_profiles?: {
      name: string
      language: string
    }[]
  }
  dimensions?: {
    width?: number | null
    height?: number | null
    length?: number | null
  } | null
}

export interface OrderDetailItem {
  id: string
  reference?: string
  price: number
  shipping_price: number
  quantity: number
  sku?: string
  volume?: number
  metadata?: Record<string, any>
  cart_item?: {
    product_container?: {
      single_product?: {
        images?: OrderDetailImage[]
        product_profiles?: OrderDetailProductProfile[]
      }
      advanced_product?: {
        images?: OrderDetailImage[]
        advanced_product_profiles?: OrderDetailProductProfile[]
        dimensions?: AdvancedProductDimensions | null
      }
    }
    advanced_product_type?: string
    selected_sofa_combinations?: string
    fabric_code?: string
    fabric_group_name?: string
    cartItemFabrics?: CartItemFabricDetail[]
    fabricCombination?: {
      id?: number
      image?: OrderDetailImage
    }
    sofa_forms?: SofaFormDetail[]
    additional_components?: AdditionalComponentDetail[]
  }
  shipping_method?: OrderDetailShippingMethod
}

export interface OrderDetail extends Order {
  shipping_address?: OrderDetailAddress
  billing_address?: OrderDetailAddress
  payment_method?: OrderDetailPaymentMethod
  order_items_detail?: OrderDetailItem[]
}

export interface OrderItem extends BaseEntity {
  title: string
  quantity: number
  unit_price: number
  total: number
  variant_id: string
  product_id: string
  reference?: string
}

export interface CreateCustomerInput {
  email: string
  full_name: string
  phone?: string
}

export interface UpdateCustomerInput {
  full_name?: string
  phone?: string
}

export interface CreateAddressInput {
  full_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  postal_code: string
  province?: string
  country_code: string
  phone?: string
  is_default_billing?: boolean
  is_default_shipping?: boolean
}

export interface UpdateAddressInput {
  full_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  postal_code?: string
  province?: string
  country_code?: string
  phone?: string
  is_default_billing?: boolean
  is_default_shipping?: boolean
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterInput extends AuthCredentials {
  full_name: string
  phone?: string
}

export interface OrdersFilterInput {
  company_code?: string
  company_name?: string
  vat_code?: string
  order_code?: string
  order_status?: string
  order_type?: string
  purchased_by?: {
    account_code?: string
    name?: string
    surname?: string
    email?: string
  }
}

export interface PaginationInput {
  take?: number
  skip?: number
}

export interface OrdersQueryOptions {
  searchText?: string
  take?: number
  skip?: number
  filters?: OrdersFilterInput
  orderBy?: {
    field: string
    direction: "asc" | "desc"
  }
}

export interface OrdersQueryResult {
  orders: Order[]
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type SearchCustomerArgs = {
  query?: string
  limit?: number
  ids?: number[]
}

export type SearchCustomerResult = {
  id: number
  name: string
  surname: string | null
  email: string | null
  account_code: string | null
  b2b_company_name: string | null
  price_listId: number | null
  role: string | null
  fabric_palettes?: Customer["fabric_palettes"]
  customer_group?: Customer["customer_group"]
  additional_components?: Customer["additional_components"]
}
