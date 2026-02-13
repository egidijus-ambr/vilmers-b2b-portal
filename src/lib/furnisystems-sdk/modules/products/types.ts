export interface ProductCardImage {
  id: number
  src: string
  src_md: string
  src_xs: string
  src_thumbnail: string
  display_order: number
}

export interface ProductProfile {
  id: number
  name: string
  language: string
}

export interface AdvancedProductProfile {
  id: number
  name: string
  language: string
}

export interface BasePrice {
  price_from: number
  price: number
  price_listId: number
}

export interface SingleProduct {
  id: number
  price: number
  images: ProductCardImage[]
  product_profiles: ProductProfile[]
}

export interface AdvancedProduct {
  id: number
  price_from: number
  base_prices: BasePrice[]
  images: ProductCardImage[]
  advanced_product_profiles: AdvancedProductProfile[]
}

export interface ProductDiscount {
  id: number
  discount: number
  active: boolean
  startDate: string
  expiryDate: string
}

export interface ProductContainer {
  id: number
  type: string
  discount: ProductDiscount | null
  single_product: SingleProduct | null
  advanced_product: AdvancedProduct | null
}

export interface CategoryProductsResponse {
  numberOfPages: number
  productsCount: number
  sortedProductContainers: ProductContainer[]
}

export interface SortedByCategoryPositionResponse {
  sortedByCategoryPositionProductContainers: CategoryProductsResponse
}
