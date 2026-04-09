export interface CatalogueFile {
  url: string
  filename: string
  market: string
  category: string
}

export interface ProductCataloguesResponse {
  productName: string
  catalogues: CatalogueFile[]
  count: number
  fromCache: boolean
}

export interface BatchProductCataloguesResponse {
  products: Record<string, { catalogues: CatalogueFile[]; count: number }>
  totalCount: number
  fromCache: boolean
}

export interface CatalogueCacheStatus {
  lastSync: string | null
  totalKeys: number
  productCount: number
  isHealthy: boolean
}

export interface CatalogueCacheStatusResponse {
  cache: CatalogueCacheStatus
  timestamp: string
}

export interface CatalogueCachePopulateStats {
  totalCached: number
  skipped: number
}

export interface CatalogueCachePopulateResponse {
  message: string
  stats: CatalogueCachePopulateStats
  status: CatalogueCacheStatus
}

export interface MergeCataloguesRequest {
  productNames: string[]
  market: string
  mode?: "merge" | "split"
  compressed?: boolean
}
