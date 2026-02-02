import { BaseEntity, Address } from "../../types/common"

export interface FabricPalette {
  id: string
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
  fabric_palettes?: FabricPalette[]
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
      }
    }
    advanced_product_type?: string
    selected_sofa_combinations?: string
    fabric_code?: string
    fabric_group_name?: string
    cartItemFabrics?: CartItemFabricDetail[]
    fabricCombination?: {
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
