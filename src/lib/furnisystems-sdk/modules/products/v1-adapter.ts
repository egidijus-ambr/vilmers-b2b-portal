/**
 * REST v1 catalogue DTOs -> the portal's existing (GraphQL-shaped) types.
 *
 * The ONE place where v1 listing answers are translated, so components keep
 * consuming ProductContainer / CategoryProductsResponse / facets exactly as
 * before. Contract: furnisystems-backend src/dto/catalog.dto.ts
 * (ProductCardDto) and src/api/v1/modules/catalog/listingSchemas.ts.
 *
 * Pure: no imports with side effects (verify script:
 * scripts/verify-catalog-v1.ts).
 */
import type {
  CategoryProductNamesResponse,
  CategoryProductsResponse,
  ProductCardImage,
  ProductContainer,
} from "./types"

// ---- v1 wire types (camelCase, as served) ----

export interface V1CardImage {
  id: number
  src: string
  srcMd: string | null
  srcXs: string | null
  srcThumbnail: string | null
  displayOrder: number
}

export interface V1CardProfile {
  id: number
  name: string
  language: string
  permalink: string
}

export interface V1ProductCard {
  id: number
  createdAt: string
  type: string
  reference: string | null
  discount: {
    id: number
    discount: number
    active: boolean
    startDate: string | null
    expiryDate: string | null
  } | null
  singleProduct: {
    id: number
    /** null when the login may not see prices (server-enforced). */
    price: number | null
    categoryPhoto: V1CardImage | null
    profiles: V1CardProfile[]
  } | null
  advancedProduct: {
    id: number
    /** null when the login may not see prices (server-enforced). */
    priceFrom: number | null
    categoryPhoto: V1CardImage | null
    profiles: V1CardProfile[]
  } | null
  primaryCategory: {
    id: number
    profiles: { name: string; language: string }[]
  } | null
}

export interface V1PageMeta {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface V1ProductCardPage {
  data: V1ProductCard[]
  meta: V1PageMeta
}

export interface V1ProductCardList {
  data: V1ProductCard[]
}

export interface V1ProductNames {
  data: { id: number; name: string }[]
  totalCount: number
}

export interface V1CategoryFacets {
  attributeGroups: {
    id: number
    name: string
    attributes: { id: number; name: string; count: number }[]
  }[]
  childCategories: { id: number; name: string; count: number }[]
  totalCount: number
}

/** Shape the filters SDK returns today (categoryFilterFacets field). */
export interface PortalCategoryFacets {
  attributeGroups: V1CategoryFacets["attributeGroups"]
  childCategories: V1CategoryFacets["childCategories"]
  totalCount: number
}

// ---- mappers ----

function mapImage(img: V1CardImage | null | undefined): ProductCardImage | null {
  if (!img) return null
  // The portal type says string; GraphQL serves the same nullable columns
  // (src_md etc. are optional in the DB) and the card falls back to `src`.
  return {
    id: img.id,
    src: img.src,
    src_md: img.srcMd as string,
    src_xs: img.srcXs as string,
    src_thumbnail: img.srcThumbnail as string,
    display_order: img.displayOrder,
  }
}

function mapProfile(p: V1CardProfile) {
  return {
    id: p.id,
    name: p.name,
    language: p.language,
    meta_information: { permalink: p.permalink },
  }
}

/**
 * One card. A null price (login with prices disabled) stays null: the
 * portal type says number, but no listing component renders the card price
 * (category-product-card computes an unused label), and GraphQL never had
 * this case. Coercing to 0 would turn "hidden" into a wrong price.
 */
export function mapV1ProductCard(card: V1ProductCard): ProductContainer {
  return {
    id: card.id,
    createdAt: card.createdAt,
    type: card.type,
    reference: card.reference,
    discount: card.discount
      ? {
          id: card.discount.id,
          discount: card.discount.discount,
          active: card.discount.active,
          startDate: card.discount.startDate as string,
          expiryDate: card.discount.expiryDate as string,
        }
      : null,
    single_product: card.singleProduct
      ? {
          id: card.singleProduct.id,
          price: card.singleProduct.price as number,
          category_photo: mapImage(card.singleProduct.categoryPhoto),
          product_profiles: (card.singleProduct.profiles ?? []).map(mapProfile),
        }
      : null,
    advanced_product: card.advancedProduct
      ? {
          id: card.advancedProduct.id,
          price_from: card.advancedProduct.priceFrom as number,
          category_photo: mapImage(card.advancedProduct.categoryPhoto),
          advanced_product_profiles: (card.advancedProduct.profiles ?? []).map(
            mapProfile
          ),
        }
      : null,
    primary_category: card.primaryCategory
      ? {
          id: card.primaryCategory.id,
          category_profiles: (card.primaryCategory.profiles ?? []).map((p) => ({
            name: p.name,
            language: p.language,
          })),
        }
      : null,
  }
}

export function mapV1ProductCards(cards: V1ProductCard[] | null | undefined) {
  return (cards ?? []).map(mapV1ProductCard)
}

/** `{data, meta}` -> `{numberOfPages, productsCount, sortedProductContainers}`. */
export function mapV1ProductCardPage(
  page: V1ProductCardPage
): CategoryProductsResponse {
  return {
    numberOfPages: page.meta?.totalPages ?? 0,
    productsCount: page.meta?.totalCount ?? 0,
    sortedProductContainers: mapV1ProductCards(page.data),
  }
}

/** names[] is derived from data (same order, names are not unique). */
export function mapV1ProductNames(
  v1: V1ProductNames
): CategoryProductNamesResponse {
  const products = (v1.data ?? []).map((p) => ({ id: p.id, name: p.name }))
  return {
    names: products.map((p) => p.name),
    products,
    totalCount: v1.totalCount ?? 0,
  }
}

export function mapV1CategoryFacets(v1: V1CategoryFacets): PortalCategoryFacets {
  return {
    attributeGroups: (v1.attributeGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      attributes: (g.attributes ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        count: a.count,
      })),
    })),
    childCategories: (v1.childCategories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      count: c.count,
    })),
    totalCount: v1.totalCount ?? 0,
  }
}

/** The empty answers the GraphQL SDK methods return on failure (fresh objects). */
export function emptyProductsPage(): CategoryProductsResponse {
  return { numberOfPages: 0, productsCount: 0, sortedProductContainers: [] }
}

export function emptyFacets(): PortalCategoryFacets {
  return { attributeGroups: [], childCategories: [], totalCount: 0 }
}
