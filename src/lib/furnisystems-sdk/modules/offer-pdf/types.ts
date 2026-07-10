export interface OfferPdfResult {
  base64: string
  url: string | null
  fileName: string | null
}

export interface OfferItemOverride {
  cartItemId: number
  name?: string
  moduleCombination?: string
  market?: string
  bottoms?: string
  totalNet?: number
}

export interface RenderOfferPdfOptions {
  language: string
  showPvm?: boolean
  showVolume?: boolean
  vatRate?: number
  persist?: boolean
  overrides?: OfferItemOverride[]
}

// --- Structured offer data (HTML template rendering) ---

export interface OfferContext {
  language: string
  showPvm: boolean
  showVolume: boolean
  vatRate: number
  logoUrl: string | null
}

export interface OfferFabricSpec {
  collection?: string
  code?: string
  colorName?: string
  type?: string
  imageUrl?: string
}

export interface OfferComponentSpec {
  groupCode?: string
  groupName?: string
  code?: string
  name?: string
  imageUrl?: string
  colorHex?: string
  widthCm?: number
  depthCm?: number
  heightCm?: number
}

export interface OfferItem {
  cartItemId: number | null
  reference: string | null
  name: string
  imageUrl: string | null
  moduleCombination: string | null
  widthCm: number | null
  depthCm: number | null
  heightCm: number | null
  quantity: number
  volumeM3: number | null
  totalNet: number
  manufacturer: string | null
  bottoms: string | null
  market: string | null
  rawSofaCombinations: string | null
  fabricSpecs: OfferFabricSpec[]
  componentSpecs: OfferComponentSpec[]
}

export interface CartOfferData {
  context: OfferContext
  items: OfferItem[]
}

export interface GetCartOfferDataOptions {
  language: string
  showPvm?: boolean
  showVolume?: boolean
  vatRate?: number
}

export interface EmailCartOfferOptions {
  fileName?: string
  recipientEmail?: string
}
