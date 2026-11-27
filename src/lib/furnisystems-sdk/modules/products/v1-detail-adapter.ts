/**
 * REST v1 product page DTO (GET /catalog/products/by-permalink/:permalink,
 * camelCase, flattened) -> the portal's FurnisystemsProductDetail (the
 * GraphQL GET_PRODUCT_BY_PERMALINK shape every PDP / configurator-page
 * reader consumes). Contract: furnisystems-backend src/dto/catalogProduct.dto.ts
 * ProductDetailDto.
 *
 * Unlike the CMS / taxonomy / settings / configurator DTOs (served in the
 * GraphQL documents' own snake_case keys), this one is renamed AND
 * re-nested, so every wrapper the GraphQL document had is rebuilt here:
 *   features[]                  -> product_features[].product_feature
 *   advancedProduct.components  -> additional_component_to_advanced_product[]
 *                                  .additional_component
 *   profile `permalink` (flat)  -> category `meta_information.permalink`
 *   linkedProducts[].product    -> linked_products_as_source[].target_product
 *                                  (a ProductCard, mapped like the listings)
 *   contentBlocks (camelCase)   -> content_blocks (ContentBlock, snake_case)
 *
 * Not served by v1 (and so absent here): `grid_product_containers` on the
 * content blocks (v1 grids are hydrated by block id through
 * GET /catalog/content-blocks/{id}/products, src/lib/data/products.ts).
 *
 * Pure, relative imports only (scripts/verify-cms-v1.ts loads it without
 * path aliases).
 */
import type { ContentBlock } from "../shop-settings/types"
import type {
  FurnisystemsProductDetail,
  LinkedProductData,
  ProductAdditionalComponent,
} from "./types"
import { mapV1ProductCard, type V1CardImage, type V1ProductCard } from "./v1-adapter"

type N<T> = T | null

// ---- v1 wire types (as served) ----

export interface V1DetailImage {
  src: string
  srcMd: N<string>
  srcXs: N<string>
}

export interface V1DetailNameProfile {
  name: string
  language: string
}

export interface V1DetailComponentProfile {
  name: string
  description: N<string>
  language: string
}

/** A linked target's image: only the two sizes the PDP comfort section shows. */
export interface V1DetailLinkedTargetImage {
  src: string
  srcMd: N<string>
}

/**
 * CatalogDetailLinkedTargetComponent (backend 2bb05ed): any linked
 * component (as GraphQL links it), minimal: no `group`, no `srcXs`.
 */
export interface V1DetailLinkedComponent {
  id: number
  linkType: string
  displayOrder: number
  targetComponent: {
    id: number
    code: N<string>
    profiles: V1DetailComponentProfile[]
    image: N<V1DetailLinkedTargetImage>
  }
}

export interface V1DetailComponent {
  id: number
  isWrapper: boolean
  code: N<string>
  group: N<{ id: number; code: N<string>; profiles: V1DetailNameProfile[] }>
  profiles: V1DetailComponentProfile[]
  image: N<V1DetailImage>
  linkedComponents: V1DetailLinkedComponent[]
}

export interface V1DetailCategoryLevel {
  id: number
  code?: N<string>
  isRootCategory: boolean
  profiles: { name: string; language: string; permalink: string }[]
  parentCategory?: N<V1DetailCategoryLevel>
}

export interface V1DetailContentBlock {
  id: number
  type: string
  style: N<string>
  videoLink: N<string>
  videoType: N<string>
  videoAutoplay: N<boolean>
  videoLoop: N<boolean>
  arrangement: N<number>
  mainImage: N<{ id: number; src: string }>
  galleryImages: { id: number; src: string; displayOrder: number }[]
  profiles: {
    id: number
    name: N<string>
    description: N<string>
    descriptionFormat: N<string>
    link: N<string>
    language: string
  }[]
  defaultMargins: N<boolean>
  maxHeight: N<number>
  maxWidth: N<number>
  minHeight: N<number>
  minWidth: N<number>
  topMargin: N<number | string>
  bottomMargin: N<number | string>
  leftMargin: N<number | string>
  rightMargin: N<number | string>
  backgroundColor: N<string>
  textColor: N<string>
  mediaMaxHeight: N<number>
  mediaMaxWidth: N<number>
  mediaMinHeight: N<number>
  mediaMinWidth: N<number>
  objectFitCover: N<boolean>
  linkNewTab: N<boolean>
  linkPage: N<{ id: string; profiles: { slug: string; language: string }[] }>
  extraCss: unknown
  linkedItems: {
    id: number
    title: N<string>
    link: N<string>
    arrangement: N<number>
    image: N<{ id: number; src: string }>
  }[]
  config: unknown
}

export interface V1ProductDetail {
  id: number
  type: string
  reference: N<string>
  contentBlocks: V1DetailContentBlock[]
  singleProduct: N<{
    id: number
    profiles: {
      name: string
      description: N<string>
      shortDescription: N<string>
      language: string
      permalink: string
    }[]
    categoryPhoto: N<V1CardImage>
    galleryPhotos: V1CardImage[]
  }>
  advancedProduct: N<{
    id: number
    advancedProductType: N<string>
    profiles: {
      name: string
      description: N<string>
      language: string
      permalink: string
    }[]
    categoryPhoto: N<V1CardImage>
    galleryPhotos: V1CardImage[]
    components: V1DetailComponent[]
  }>
  categories: { code: N<string> }[]
  primaryCategory: N<V1DetailCategoryLevel>
  features: {
    photo: N<{ srcXs: N<string>; src: string }>
    profiles: V1DetailComponentProfile[]
  }[]
  linkedProducts: {
    linkType: string
    displayOrder: number
    product: V1ProductCard
  }[]
}

// ---- mappers ----

function detailImage(img: N<V1CardImage> | undefined) {
  if (!img) return null
  return {
    id: img.id,
    src: img.src,
    src_md: img.srcMd ?? null,
    src_xs: img.srcXs ?? null,
    src_thumbnail: img.srcThumbnail ?? null,
    display_order: img.displayOrder,
  }
}

function componentImage(
  img: N<V1DetailImage | V1DetailLinkedTargetImage> | undefined
) {
  if (!img) return null
  return {
    src: img.src,
    src_md: img.srcMd ?? null,
    // A linked target's image has no srcXs (nothing renders it there).
    src_xs: ("srcXs" in img ? img.srcXs : null) ?? null,
  }
}

const nameProfiles = (ps: V1DetailNameProfile[] | null | undefined) =>
  (ps ?? []).map((p) => ({ name: p.name, language: p.language }))

const componentProfiles = (ps: V1DetailComponentProfile[] | null | undefined) =>
  (ps ?? []).map((p) => ({
    name: p.name,
    description: p.description ?? null,
    language: p.language,
  }))

function mapComponent(c: V1DetailComponent): ProductAdditionalComponent {
  return {
    id: c.id,
    is_wrapper: c.isWrapper,
    code: c.code ?? null,
    additional_component_group: {
      ...(c.group?.id != null ? { id: c.group.id } : {}),
      code: c.group?.code ?? null,
      additional_component_group_profiles: nameProfiles(c.group?.profiles),
    },
    additional_component_profiles: componentProfiles(c.profiles),
    image: componentImage(c.image),
    linked_components_source: (c.linkedComponents ?? []).map((l) => ({
      id: l.id,
      link_type: l.linkType,
      display_order: l.displayOrder,
      target_component: {
        id: l.targetComponent.id,
        code: l.targetComponent.code ?? null,
        // No `additional_component_group`: v1 does not serve the target's
        // group (the PDP reads only profiles, code and image).
        additional_component_profiles: componentProfiles(
          l.targetComponent.profiles
        ),
        image: componentImage(l.targetComponent.image),
      },
    })),
  }
}

/** GraphQL selects `meta_information { permalink }`, null when there is none. */
function categoryProfiles(
  ps: V1DetailCategoryLevel["profiles"] | null | undefined
) {
  return (ps ?? []).map((p) => ({
    name: p.name,
    language: p.language,
    meta_information: p.permalink ? { permalink: p.permalink } : null,
  }))
}

type PrimaryCategory = NonNullable<FurnisystemsProductDetail["primary_category"]>

function mapCategoryChain(c: N<V1DetailCategoryLevel> | undefined): PrimaryCategory | null {
  if (!c) return null
  const grandparent = c.parentCategory?.parentCategory ?? null
  const parent = c.parentCategory ?? null
  return {
    id: c.id,
    code: c.code ?? null,
    is_root_category: c.isRootCategory,
    category_profiles: categoryProfiles(c.profiles),
    parent_category: parent
      ? {
          id: parent.id,
          is_root_category: parent.isRootCategory,
          category_profiles: categoryProfiles(parent.profiles),
          parent_category: grandparent
            ? {
                id: grandparent.id,
                is_root_category: grandparent.isRootCategory,
                category_profiles: categoryProfiles(grandparent.profiles),
              }
            : null,
        }
      : null,
  }
}

/** A PDP content block (camelCase) -> the GraphQL ContentBlock shape. */
export function mapV1DetailContentBlock(b: V1DetailContentBlock): ContentBlock {
  return {
    id: b.id as unknown as string,
    type: b.type as ContentBlock["type"],
    style: b.style ?? null,
    video_link: b.videoLink ?? null,
    video_type: (b.videoType ?? null) as ContentBlock["video_type"],
    video_autoplay: b.videoAutoplay ?? null,
    video_loop: b.videoLoop ?? null,
    arrangement: b.arrangement ?? null,
    main_image: (b.mainImage
      ? { id: b.mainImage.id, src: b.mainImage.src }
      : null) as ContentBlock["main_image"],
    gallery_images: (b.galleryImages ?? []).map((g) => ({
      id: g.id,
      src: g.src,
      display_order: g.displayOrder,
    })) as unknown as ContentBlock["gallery_images"],
    content_block_profiles: (b.profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      description_format: p.descriptionFormat,
      link: p.link,
      language: p.language,
    })) as unknown as ContentBlock["content_block_profiles"],
    default_margins: b.defaultMargins ?? null,
    max_height: b.maxHeight ?? null,
    max_width: b.maxWidth ?? null,
    min_height: b.minHeight ?? null,
    min_width: b.minWidth ?? null,
    top_margin: (b.topMargin ?? null) as ContentBlock["top_margin"],
    bottom_margin: (b.bottomMargin ?? null) as ContentBlock["bottom_margin"],
    left_margin: (b.leftMargin ?? null) as ContentBlock["left_margin"],
    right_margin: (b.rightMargin ?? null) as ContentBlock["right_margin"],
    background_color: b.backgroundColor ?? null,
    text_color: b.textColor ?? null,
    media_max_height: b.mediaMaxHeight ?? null,
    media_max_width: b.mediaMaxWidth ?? null,
    media_min_height: b.mediaMinHeight ?? null,
    media_min_width: b.mediaMinWidth ?? null,
    object_fit_cover: b.objectFitCover ?? null,
    link_new_tab: b.linkNewTab ?? null,
    link_page: b.linkPage
      ? {
          id: b.linkPage.id,
          page_profiles: (b.linkPage.profiles ?? []).map((p) => ({
            slug: p.slug,
            language: p.language,
          })),
        }
      : null,
    extra_css: (b.extraCss ?? null) as ContentBlock["extra_css"],
    linked_items: (b.linkedItems ?? []).map((i) => ({
      id: i.id,
      title: i.title,
      link: i.link,
      arrangement: i.arrangement,
      image: i.image ? { id: i.image.id, src: i.image.src } : null,
    })) as unknown as ContentBlock["linked_items"],
    config: (b.config ?? null) as ContentBlock["config"],
  }
}

export function mapV1ProductDetail(d: V1ProductDetail): FurnisystemsProductDetail {
  const sp = d.singleProduct
  const ap = d.advancedProduct
  return {
    id: d.id,
    type: d.type,
    reference: d.reference ?? null,
    content_blocks: (d.contentBlocks ?? []).map(mapV1DetailContentBlock),
    single_product: sp
      ? {
          id: sp.id,
          product_profiles: (sp.profiles ?? []).map((p) => ({
            name: p.name,
            description: p.description ?? null,
            short_description: p.shortDescription ?? null,
            language: p.language,
            permalink: p.permalink ?? "",
          })),
          category_photo: detailImage(sp.categoryPhoto),
          gallery_photos: (sp.galleryPhotos ?? []).map((i) => detailImage(i)!),
        }
      : null,
    advanced_product: ap
      ? {
          id: ap.id,
          advanced_product_type: ap.advancedProductType ?? null,
          advanced_product_profiles: (ap.profiles ?? []).map((p) => ({
            name: p.name,
            description: p.description ?? null,
            language: p.language,
            permalink: p.permalink ?? "",
          })),
          category_photo: detailImage(ap.categoryPhoto),
          gallery_photos: (ap.galleryPhotos ?? []).map((i) => detailImage(i)!),
          additional_component_to_advanced_product: (ap.components ?? []).map(
            (c) => ({ additional_component: mapComponent(c) })
          ),
        }
      : null,
    categories: (d.categories ?? []).map((c) => ({ code: c.code ?? null })),
    primary_category: mapCategoryChain(d.primaryCategory),
    product_features: (d.features ?? []).map((f) => ({
      product_feature: {
        photo: f.photo ? { src_xs: f.photo.srcXs ?? null, src: f.photo.src } : null,
        product_feature_profiles: componentProfiles(f.profiles),
      },
    })),
    linked_products_as_source: (d.linkedProducts ?? []).map(
      (l): LinkedProductData => ({
        link_type: l.linkType as LinkedProductData["link_type"],
        display_order: l.displayOrder,
        target_product: mapV1ProductCard(l.product),
      })
    ),
  }
}
