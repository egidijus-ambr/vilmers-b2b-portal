export interface MaterialAvailabilityRequest {
  dataAreaId: string
  itemId: string
  configId: string
}

export interface MaterialAvailabilityRawResponse {
  $id?: string
  totalQty: number
  status: string
  errorMessage: string
}

export interface MaterialAvailabilityResult {
  totalQty: number
}
