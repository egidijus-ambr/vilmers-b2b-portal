export interface ProductSummary {
  name: string
  main_product_category: string
  secondary_category: string
  productPhotos?: number
  interiorPhotos?: number
}

export interface ProductsSummaryResponse {
  summary: {
    totalProducts: number
    totalProductPhotos: number
    totalInteriorPhotos: number
  }
  products: ProductSummary[]
  timestamp: string
}

export interface ProductPhoto {
  url: string
  name: string
  variant?: string
  category: "INTERIOR_PHOTOS" | "PRODUCT_PHOTOS"
  combination?: string
  fabric?: string
}

export interface ProductPhotosResponse {
  productName: string
  photos: ProductPhoto[]
}
