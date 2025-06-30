// Common types used across the Furnisystems SDK

export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  limit: number
  offset: number
}

export interface SortParams {
  field: string
  direction: "asc" | "desc"
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined
}

export interface Address {
  id?: string
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

export interface Money {
  amount: number
  currency_code: string
}

export interface Region {
  id: string
  name: string
  currency_code: string
  countries: Country[]
}

export interface Country {
  id: string
  name: string
  iso_2: string
  iso_3: string
  num_code: number
  region_id: string
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, any>
}
