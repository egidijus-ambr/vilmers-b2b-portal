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

export interface SortedByCollectionPositionResponse {
  sortedByCollectionPositionProductContainers: CategoryProductsResponse
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
  /**
   * Raw (un-hydrated) content blocks, mirroring `Page.content_blocks` in the
   * pages module. `product_grid`/`page_grid`/`category_tiles` blocks need a
   * post-query hydration pass (enrichContentBlocksWithProducts /
   * enrichContentBlocksWithTileCategories / enrichContentBlocksWithPages in
   * src/lib/data/) before they carry `products`/`grid_pages`/`categories` —
   * see products/[handle]/page.tsx.
   */
  content_blocks?: import("../shop-settings/types").ContentBlock[] | null
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

// Pricelist export types (see ProductsModule.getSofaPricelistExportProducts).
// Shapes are intentionally narrow — only the fields the export needs — since
// this is a dedicated bulk query, not a reuse of the product-card fragment.
export interface PricelistExportPriceRow {
  price: number
  fabrice_price_category: {
    group_number: number
  }
}

export interface PricelistExportDimensions {
  width: number | null
  height: number | null
  length: number | null
}

export interface PricelistExportPackageDimension {
  volume: number | null
}

// See furnisystems-backend's SofaFormBlueprint.ts: `blueprint` is null only
// if the SofaForm row itself couldn't be read (not a normal case here,
// since we just queried it) — every other state (no render requested yet,
// pending, failed) comes back as a non-null object with `thumbnail_url`
// itself null. `status`'s exact enum members are an implementation detail
// this module doesn't rely on — see pricelist-blueprints.ts's `isUsable`,
// which gates purely on `thumbnail_url` + positive dimensions.
export interface PricelistExportSofaFormBlueprint {
  status: string
  thumbnail_url: string | null
  thumb_width: number | null
  thumb_height: number | null
}

export interface PricelistExportSofaForm {
  id: number
  name: string | null
  code: string | null
  dimensions: PricelistExportDimensions | null
  package_dimensions: PricelistExportPackageDimension[]
  form_price_fabric_category: PricelistExportPriceRow[]
  blueprint: PricelistExportSofaFormBlueprint | null
}

export interface PricelistExportCategoryPhoto {
  src_facebook: string | null
}

// OTHER_WITH_FABRICS support (see ProductsModule.getSofaPricelistExportProducts
// and pricelist-workbook.ts's buildComponentRows). Unlike sofas, this product
// type has no module geometry — its priced items are additional-component
// rows (AdditionalComponentToAdvancedProduct), grouped by
// AdditionalComponentGroup. Names come from the `*_profiles` relations
// (filtered server-side to the export language) — neither AdditionalComponent
// nor AdditionalComponentGroup has a bare `name` scalar.
export interface PricelistExportComponentProfile {
  name: string
}

export interface PricelistExportComponentGroupProfile {
  name: string
}

export interface PricelistExportComponentGroup {
  id: number
  code: string | null
  order: number | null
  use_fabric_prices_for_components?: boolean
  additional_component_group_profiles: PricelistExportComponentGroupProfile[]
}

export interface PricelistExportComponent {
  id: number
  code: string | null
  component_sku: string | null
  additional_component_profiles: PricelistExportComponentProfile[]
  dimensions: PricelistExportDimensions | null
  package_dimensions: PricelistExportPackageDimension[]
  additional_component_group: PricelistExportComponentGroup
}

export interface PricelistExportComponentExtraPrice {
  price: number
}

export interface PricelistExportComponentAssociation {
  // Legacy scalar price (NOT pricelist-scoped) — see
  // pricelist-workbook.ts's flat-price resolution for why this is only a
  // last-resort fallback behind `extra_prices`.
  extra_price: number
  // Pre-filtered by the query to this export's pricelist, so at most one
  // entry (AdditionalComponentExtraPrice is unique per
  // (additionalComponentToAdvancedProductId, price_listId)).
  extra_prices: PricelistExportComponentExtraPrice[]
  price_fabric_category: PricelistExportPriceRow[]
  additional_component: PricelistExportComponent
}

// One enabled AdditionalComponentGroup<->AdvancedProduct link (the
// group-level counterpart of PricelistExportComponentAssociation's own
// `enabled` gating) — see ProductsModule.getSofaPricelistExportProducts's
// query doc comment. pricelist-workbook.ts's buildComponentRows uses the
// set of `additional_component_group.id`s here to drop rows belonging to a
// group that's linked-but-disabled for this specific product, even when
// the individual component associations in that group are still enabled.
export interface PricelistExportComponentGroupLink {
  additional_component_group: {
    id: number
  }
}

export interface PricelistExportAdvancedProduct {
  id: number
  // Discriminates the sofa-module vs. additional-component sheet-building
  // path in pricelist-workbook.ts — see
  // ProductsModule.getSofaPricelistExportProducts's admission-where doc
  // comment for the full list of AdvancedProductType members.
  advanced_product_type: string
  advanced_product_profiles: { name: string }[]
  category_photo: PricelistExportCategoryPhoto | null
  sofa_forms: PricelistExportSofaForm[]
  // For chairs/armchairs etc. priced as a single fabric-category price
  // rather than per-module — see pricelist-workbook.ts's "base row".
  // Empirically empty for every local OTHER_WITH_FABRICS product today, but
  // not assumed to stay that way.
  advanced_product_price_fabric_category: PricelistExportPriceRow[]
  additional_component_to_advanced_product: PricelistExportComponentAssociation[]
  // Optional defensively (see this file's other optional fields) even
  // though the query always requests it — a query response should never be
  // trusted to exactly match its TypeScript shape.
  additional_component_group_to_advanced_product?: PricelistExportComponentGroupLink[]
}

export interface PricelistExportProduct {
  id: number
  advanced_product: PricelistExportAdvancedProduct | null
}

export type CategorySortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest'

type GraphQLSortBy = 'SVP_DESC' | 'NAME_ASC' | 'NAME_DESC' | 'CREATED_AT_DESC' | 'CREATED_AT_ASC'

export const SORT_OPTION_TO_GRAPHQL: Record<CategorySortOption, GraphQLSortBy> = {
  name_asc: 'NAME_ASC',
  name_desc: 'NAME_DESC',
  newest: 'CREATED_AT_DESC',
  oldest: 'CREATED_AT_ASC',
}
