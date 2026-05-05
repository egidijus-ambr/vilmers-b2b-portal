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
  meta_information: {
    permalink: string
  }
}

export interface AdvancedProductProfile {
  id: number
  name: string
  language: string
  meta_information: {
    permalink: string
  }
}

export interface BasePrice {
  price_from: number
  price: number
  price_listId: number
}

export interface SingleProduct {
  id: number
  price: number
  category_photo: ProductCardImage | null
  product_profiles: ProductProfile[]
}

export interface AdvancedProduct {
  id: number
  advanced_product_type?: string | null
  price_from: number
  base_prices: BasePrice[]
  category_photo: ProductCardImage | null
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
  reference?: string | null
  discount: ProductDiscount | null
  single_product: SingleProduct | null
  advanced_product: AdvancedProduct | null
  primary_category?: {
    id: number
    category_profiles: {
      name: string
      language: string
    }[]
  } | null
}

export interface CategoryProductsResponse {
  numberOfPages: number
  productsCount: number
  sortedProductContainers: ProductContainer[]
}

export interface CategoryProductNamesResponse {
  names: string[]
  totalCount: number
}

export interface SortedByCategoryPositionResponse {
  sortedByCategoryPositionProductContainers: CategoryProductsResponse
}

export interface SearchProductsResponse {
  sortedBySearchTermPositionProductContainers: CategoryProductsResponse
}

// Additional component types
export interface ComponentGroupProfile {
  name: string
  language: string
}

export interface ComponentGroupRef {
  id?: number
  code: string | null
  additional_component_group_profiles: ComponentGroupProfile[]
}

export interface ComponentProfile {
  name: string
  description: string | null
  language: string
}

export interface ComponentImage {
  src: string
  src_md: string | null
  src_xs: string | null
}

export interface LinkedComponentTarget {
  id: number
  code: string | null
  additional_component_group: ComponentGroupRef
  additional_component_profiles: ComponentProfile[]
  image: ComponentImage | null
}

export interface LinkedComponentData {
  id: number
  link_type: string
  display_order: number
  target_component: LinkedComponentTarget
}

export interface ProductAdditionalComponent {
  id: number
  is_wrapper: boolean
  code: string | null
  additional_component_group: ComponentGroupRef
  additional_component_profiles: ComponentProfile[]
  image: ComponentImage | null
  linked_components_source: LinkedComponentData[] | null
}

export interface ProductComponentAssociation {
  additional_component: ProductAdditionalComponent
}

// Product feature types
export interface ProductFeatureProfile {
  name: string
  description: string | null
  language: string
}

export interface ProductFeaturePhoto {
  src_xs: string | null
  src: string
}

export interface ProductFeatureData {
  product_feature: {
    photo: ProductFeaturePhoto | null
    product_feature_profiles: ProductFeatureProfile[]
  }
}

// Product detail types for single product page
export interface FurnisystemsProductDetail {
  id: number
  type: string
  reference?: string | null
  single_product: {
    id: number
    product_profiles: {
      name: string
      description: string | null
      short_description: string | null
      language: string
      permalink: string
    }[]
    category_photo: {
      id: number
      src: string
      src_md: string | null
      src_xs: string | null
      src_thumbnail: string | null
      display_order: number
    } | null
    gallery_photos: {
      id: number
      src: string
      src_md: string | null
      src_xs: string | null
      src_thumbnail: string | null
      display_order: number
    }[]
  } | null
  advanced_product: {
    id: number
    advanced_product_type?: string | null
    advanced_product_profiles: {
      name: string
      description: string | null
      language: string
      permalink: string
    }[]
    category_photo: {
      id: number
      src: string
      src_md: string | null
      src_xs: string | null
      src_thumbnail: string | null
      display_order: number
    } | null
    gallery_photos: {
      id: number
      src: string
      src_md: string | null
      src_xs: string | null
      src_thumbnail: string | null
      display_order: number
    }[]
    additional_component_to_advanced_product?: ProductComponentAssociation[] | null
  } | null
  primary_category: {
    id: number
    is_root_category?: boolean
    category_profiles: {
      name: string
      language: string
      meta_information: {
        permalink: string
      } | null
    }[]
    parent_category?: {
      id: number
      is_root_category?: boolean
      category_profiles: {
        name: string
        language: string
        meta_information: {
          permalink: string
        } | null
      }[]
      parent_category?: {
        id: number
        is_root_category?: boolean
        category_profiles: {
          name: string
          language: string
          meta_information: {
            permalink: string
          } | null
        }[]
      } | null
    } | null
  } | null
  product_features: ProductFeatureData[] | null
  linked_products_as_source: LinkedProductData[] | null
}

export interface FindProductByPermalinkResponse {
  findFirstProductContainer: FurnisystemsProductDetail | null
}

// Linked product types
export type LinkedProductType = 'ACCESSORY' | 'GOES_WELL_WITH' | 'ALTERNATIVE'

export interface LinkedProductData {
  link_type: LinkedProductType
  display_order: number
  target_product: ProductContainer
}

export type CategorySortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest'

type GraphQLSortBy = 'SVP_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'CREATED_AT_DESC' | 'CREATED_AT_ASC'

export const SORT_OPTION_TO_GRAPHQL: Record<CategorySortOption, GraphQLSortBy> = {
  name_asc: 'NAME_ASC',
  name_desc: 'NAME_DESC',
  newest: 'CREATED_AT_DESC',
  oldest: 'CREATED_AT_ASC',
}
