import { ProductCardImage } from "../products/types"

export type CartSummary = {
  id: number
  name: string | null
  isActive: boolean
  updatedAt: string
  itemCount: number
}

export interface FurnisystemsCart {
  id: number
  name: string | null
  isActive: boolean
  customerId: number
  items: FurnisystemsCartItem[]
  createdAt: string
  updatedAt: string
}

export interface FurnisystemsCartItem {
  id: number
  quantity: number | null
  price: number | null
  volume: number | null
  product_type: string
  advanced_product_type: string | null
  fabric_code: string | null
  fabric_group_name: string | null
  selected_sofa_combinations: string | null
  cartId: number | null
  productContainerId: number | null
  product_container: {
    single_product?: {
      images?: { src: string; src_xs?: string; src_thumbnail?: string }[]
      category_photo?: ProductCardImage | null
      product_profiles?: { name: string; language: string }[]
    }
    advanced_product?: {
      images?: { src: string; src_xs?: string; src_thumbnail?: string }[]
      category_photo?: ProductCardImage | null
      advanced_product_profiles?: { name: string; language: string }[]
      dimensions?: Record<string, number | null> | null
    }
  } | null
  additional_components: {
    id: number
    code?: string
    additional_component_profiles?: { name: string; material_name?: string; language: string }[]
    image?: { src: string; src_thumbnail?: string }
    color?: { id: number; hex: string; background?: string }
    additional_component_group?: {
      id: number
      code: string
      additional_component_group_profiles?: { name: string; language: string }[]
    }
    dimensions?: { width?: number; height?: number; length?: number } | null
    is_wrapper?: boolean | null
    linked_components_source?: Array<{
      display_order?: number | null
      link_type: string
      target_component: {
        id: number
        code: string | null
        image: { src?: string | null; src_thumbnail?: string | null } | null
        additional_component_profiles: Array<{
          name: string | null
          material_name?: string | null
          language: string
        }>
      }
    }> | null
  }[]
  cartItemFabrics: {
    id: number
    fabric?: {
      id: number
      code: string
      color_name?: string
      image?: { src: string; src_thumbnail?: string }
    }
    fabric_group?: {
      id: number
      code?: string
      type?: string
      fabric_group_profiles?: { language: string; name: string }[]
    }
    combination_option?: {
      id: number
      fabricCombinationOptionProfiles?: { language: string; name: string }[]
    }
  }[]
  sofa_forms: { id: number; name?: string; code?: string; dimensions?: any }[]
  fabric_group: { id: number } | null
  fabric: { id: number } | null
  fabricCombination: {
    id: number
    image?: { src?: string; src_xs?: string; src_thumbnail?: string }
  } | null
  components_by_module?: Array<{
    additionalComponentId: number
    groupCode: string
  }> | null
  reference?: string
  createdAt: string
  updatedAt: string
}

export interface AddCartItemInput {
  productContainerId: number
  product_type: string
  advanced_product_type?: string
  quantity: number
  price?: number
  volume?: number
  fabricId?: number
  fabric_groupId?: number
  fabricCombinationId?: number
  fabric_code?: string
  fabric_group_name?: string
  selected_sofa_combinations?: string
  additionalComponentIds?: number[]
  componentsByModule?: Array<{
    additionalComponentId: number
    groupCode: string
  }>
  cartItemFabrics?: { fabricId?: number; fabric_groupId?: number; combination_optionId?: number }[]
  customerReference?: string
}
