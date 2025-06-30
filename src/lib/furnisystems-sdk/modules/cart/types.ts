import { BaseEntity, Address, Money, Region } from "../../types/common"

export interface Cart extends BaseEntity {
  region_id: string
  region?: Region
  customer_id?: string
  email?: string
  items: CartItem[]
  shipping_address?: Address
  billing_address?: Address
  shipping_methods?: ShippingMethod[]
  payment_sessions?: PaymentSession[]
  total: number
  subtotal: number
  tax_total: number
  shipping_total: number
  discount_total: number
  currency_code: string
  promotions?: Promotion[]
}

export interface CartItem extends BaseEntity {
  cart_id: string
  variant_id: string
  product_id: string
  title: string
  description?: string
  thumbnail?: string
  quantity: number
  unit_price: number
  total: number
  original_total: number
  original_unit_price: number
  metadata?: Record<string, any>
  variant?: ProductVariant
  product?: Product
}

export interface Product extends BaseEntity {
  title: string
  description?: string
  handle: string
  thumbnail?: string
  images?: ProductImage[]
  variants?: ProductVariant[]
  tags?: ProductTag[]
  metadata?: Record<string, any>
}

export interface ProductVariant extends BaseEntity {
  title: string
  sku?: string
  product_id: string
  prices?: ProductPrice[]
  inventory_quantity?: number
  metadata?: Record<string, any>
}

export interface ProductImage extends BaseEntity {
  url: string
  alt_text?: string
}

export interface ProductTag extends BaseEntity {
  value: string
}

export interface ProductPrice extends BaseEntity {
  amount: number
  currency_code: string
  variant_id: string
}

export interface ShippingMethod extends BaseEntity {
  name: string
  price: number
  currency_code: string
  option_id: string
}

export interface PaymentSession extends BaseEntity {
  provider_id: string
  amount: number
  currency_code: string
  status: string
  data?: Record<string, any>
}

export interface Promotion extends BaseEntity {
  code: string
  type: string
  value: number
  description?: string
}

export interface CreateCartInput {
  region_id: string
  customer_id?: string
  email?: string
}

export interface UpdateCartInput {
  region_id?: string
  email?: string
  shipping_address?: Address
  billing_address?: Address
  promo_codes?: string[]
}

export interface AddCartItemInput {
  variant_id: string
  quantity: number
  metadata?: Record<string, any>
}

export interface UpdateCartItemInput {
  quantity: number
  metadata?: Record<string, any>
}

export interface InitiatePaymentSessionInput {
  provider_id: string
  data?: Record<string, any>
}
