export interface ProductSummary {
  name: string
  productPhotos: number
  interiorPhotos: number
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
  key: string
  name: string
}

export interface ProductPhotosResponse {
  productName: string
  photos: ProductPhoto[]
  count: number
}
