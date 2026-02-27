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

export interface SortedByCategoryPositionResponse {
  sortedByCategoryPositionProductContainers: CategoryProductsResponse
}

export interface SearchProductsResponse {
  sortedBySearchTermPositionProductContainers: CategoryProductsResponse
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
  single_product: {
    id: number
    product_profiles: {
      name: string
      description: string | null
      short_description: string | null
      language: string
      permalink: string
    }[]
    images: {
      id: number
      src: string
      src_md: string | null
      display_order: number
    }[]
  } | null
  advanced_product: {
    id: number
    advanced_product_profiles: {
      name: string
      description: string | null
      language: string
      permalink: string
    }[]
    images: {
      id: number
      src: string
      src_md: string | null
      display_order: number
    }[]
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
}

export interface FindProductByPermalinkResponse {
  findFirstProductContainer: FurnisystemsProductDetail | null
}

export type CategorySortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest'

type GraphQLSortBy = 'SVP_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'CREATED_AT_DESC' | 'CREATED_AT_ASC'

export const SORT_OPTION_TO_GRAPHQL: Record<CategorySortOption, GraphQLSortBy> = {
  name_asc: 'NAME_ASC',
  name_desc: 'NAME_DESC',
  newest: 'CREATED_AT_DESC',
  oldest: 'CREATED_AT_ASC',
}
