import { ReactNode } from "react"

export interface ComponentDisplay {
  id: string
  name: string
  groupName?: string
  groupCode?: string
  image?: string
  colorHex?: string
}

export interface ProductItemRow {
  id: string
  name: string
  reference?: string
  image?: string
  unitPrice: number
  quantity: number
  total: number
  volume?: number
  isAdvanced: boolean
  orderDetailItem?: any // Pass-through for SofaConfigurationDetail (which needs full OrderDetailItem)
}

export interface ProductItemsTableProps {
  items: ProductItemRow[]
  renderActions?: (item: ProductItemRow) => ReactNode
  formatPrice: (price: number) => string
  translations: {
    orderItems: string
    unitPrice: string
    quantity: string
    volume: string
    total: string
    noImage: string
    customerReference: string
    showConfiguration: string
    hideConfiguration: string
  }
  showVolume: boolean
  onReferenceChange?: (itemId: string, newReference: string) => Promise<void>
}
