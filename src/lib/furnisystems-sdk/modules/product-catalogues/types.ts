/**
 * One catalogue PDF attached to a product container (a ProductFile row on the
 * backend). Served by /product-files/catalogues, keyed by product container id.
 */
export interface CatalogueFile {
  url: string
  filename: string
  market: string
  category: string
}

export interface ProductCataloguesResponse {
  productContainerId: number
  catalogues: CatalogueFile[]
  count: number
}

export interface BatchProductCataloguesResponse {
  /** Keyed by product container id (stringified by JSON). */
  products: Record<string, { catalogues: CatalogueFile[]; count: number }>
  totalCount: number
}

export interface MergeCataloguesRequest {
  /** Product container ids, in the order the output should follow. */
  productIds: number[]
  market: string
  mode?: "merge" | "split"
  compressed?: boolean
}
