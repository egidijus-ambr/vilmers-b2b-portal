import { BaseEntity, Address } from "../../types/common"

export interface Customer extends BaseEntity {
  email: string
  full_name: string
  phone?: string
  has_account: boolean
  addresses?: Address[]
  orders?: Order[]
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
  items?: OrderItem[]
  shipping_address?: Address
  billing_address?: Address
}

export interface OrderItem extends BaseEntity {
  title: string
  quantity: number
  unit_price: number
  total: number
  variant_id: string
  product_id: string
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
