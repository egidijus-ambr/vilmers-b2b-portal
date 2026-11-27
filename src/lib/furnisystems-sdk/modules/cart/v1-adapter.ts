/**
 * REST v1 carts / cart offers (portal REST migration slices 8 and 9) ->
 * the portal's existing GraphQL-shaped types, so the cart, the checkout and
 * the offer page keep consuming FurnisystemsCart / FurnisystemsCartItem /
 * CartSummary / CartOfferData unchanged.
 *
 * Contract: furnisystems-backend docs/api/openapi.v1.json
 *   /me/carts*, /me/carts/:id/items*, /me/carts/:id/offer*
 * (DTOs: src/dto/carts.dto.ts, src/api/v1/modules/me/{cartSchemas,
 * offerRoutes}.ts; backend commit 13c1182).
 *
 * Checkout (still GraphQL createNewOrder) builds its order lines from the
 * mapped items, so ids stay NUMBERS (GraphQL Int), and
 * `cartItemFabrics[].{fabric,fabric_group,combination_option}.id`,
 * `fabric.id`, `fabric_group.id`, `fabricCombination.id`,
 * `additional_components[].id`, `components_by_module` and
 * `productContainerId` must all survive (checkout-form buildAdvancedProductData).
 *
 * Not served by v1 (and not read by the portal): `CartItem.metadata`,
 * `category_photo.display_order` (filled with 0), the item's `cartId`
 * (stamped from the parent cart / the path id).
 *
 * Pure: no imports with side effects (scripts/verify-carts-v1.ts).
 */
import type {
  AddCartItemInput,
  CartSummary,
  FurnisystemsCart,
  FurnisystemsCartItem,
} from "./types"
import type { ProductCardImage } from "../products/types"
import type { CartOfferData } from "../offer-pdf/types"
import { DIMENSION_KEYS, type V1Image } from "../customer/v1-adapter"

type N<T> = T | null | undefined

// ---- wire types (camelCase, as served; nullable where the DTO allows) ----

interface V1Named {
  id?: number
  name: N<string>
  language: string
}

interface V1ComponentName extends V1Named {
  materialName?: N<string>
}

export interface V1CartComponent {
  id: number
  code?: N<string>
  isWrapper?: N<boolean>
  groupId?: N<number>
  profiles?: N<V1ComponentName[]>
  image?: N<V1Image>
  color?: N<{ id: number; hex?: N<string>; background?: N<string> }>
  dimensions?: N<{ width?: N<number>; height?: N<number>; length?: N<number> }>
  group?: N<{ id: number; code?: N<string>; profiles?: N<V1Named[]> }>
  linked?: N<
    {
      id?: number
      displayOrder?: N<number>
      linkType: string
      target: N<{
        id: number
        code?: N<string>
        image?: N<V1Image>
        profiles?: N<V1ComponentName[]>
      }>
    }[]
  >
}

export interface V1CartItemFabric {
  id: number
  fabricCode?: N<string>
  fabricColorName?: N<string>
  fabricGroupName?: N<string>
  fabricGroup?: N<{ id: number; code?: N<string>; type?: N<string>; profiles?: N<V1Named[]> }>
  fabric?: N<{ id: number; code?: N<string>; colorName?: N<string>; image?: N<V1Image> }>
  combinationOption?: N<{ id: number; profiles?: N<V1Named[]> }>
}

export interface V1CartItem {
  id: number
  quantity: N<number>
  price: N<number>
  volume: N<number>
  reference?: N<string>
  productType: N<string>
  advancedProductType?: N<string>
  fabricCode?: N<string>
  fabricGroupName?: N<string>
  fabricColorName?: N<string>
  selectedSofaCombinations?: N<string>
  componentsByModule?: N<{ additionalComponentId: number; groupCode: string }[]>
  createdAt: string
  updatedAt: string
  product?: N<{
    id: number
    type?: N<string>
    singleProduct?: N<{
      id?: number
      images?: N<V1Image[]>
      categoryPhoto?: N<V1Image>
      profiles?: N<V1Named[]>
    }>
    advancedProduct?: N<{
      id?: number
      images?: N<V1Image[]>
      categoryPhoto?: N<V1Image>
      profiles?: N<V1Named[]>
      dimensions?: N<Record<string, N<number>>>
    }>
  }>
  fabric?: N<{ id: number; code?: N<string>; colorName?: N<string>; image?: N<V1Image> }>
  fabricGroup?: N<{ id: number; code?: N<string>; type?: N<string>; profiles?: N<V1Named[]> }>
  fabricCombination?: N<{ id: number; image?: N<V1Image> }>
  fabrics?: N<V1CartItemFabric[]>
  components?: N<V1CartComponent[]>
  sofaForms?: N<{ id: number; name?: N<string>; code?: N<string> }[]>
}

export interface V1Cart {
  id: number
  name: N<string>
  isActive: boolean
  isModified?: N<boolean>
  customerId: number
  createdAt: string
  updatedAt: string
  items?: N<V1CartItem[]>
}

export interface V1CartSummary {
  id: number
  name: N<string>
  isActive: boolean
  isModified?: N<boolean>
  updatedAt: string
  itemCount: number
}

export type V1CartOffer = CartOfferData

// ---- helpers ----

const arr = <T>(v: N<T[]>): T[] => (Array.isArray(v) ? v : [])

function imageSrcs(v: N<V1Image>) {
  if (!v || !v.src) return undefined
  return {
    src: v.src,
    ...(v.srcXs ? { src_xs: v.srcXs } : {}),
    ...(v.srcThumbnail ? { src_thumbnail: v.srcThumbnail } : {}),
  }
}

function categoryPhoto(v: N<V1Image>): ProductCardImage | null {
  if (!v || !v.src) return null
  return {
    id: v.id ?? 0,
    src: v.src,
    src_md: v.srcMd ?? "",
    src_xs: v.srcXs ?? "",
    src_thumbnail: v.srcThumbnail ?? "",
    // Not served by v1 (ImageDto); the cart only reads the src fields.
    display_order: 0,
  }
}

const named = (p: N<V1Named[]>) =>
  arr(p).map((x) => ({ name: x.name ?? "", language: x.language }))

function dimensions(d: N<Record<string, N<number>>>) {
  if (!d) return null
  const out: Record<string, number | null> = {}
  Object.keys(DIMENSION_KEYS).forEach((k) => {
    if (k in d) out[DIMENSION_KEYS[k]] = d[k] ?? null
  })
  return out
}

function component(
  c: V1CartComponent
): FurnisystemsCartItem["additional_components"][number] {
  const img = imageSrcs(c.image)
  return {
    id: c.id,
    ...(c.code != null ? { code: c.code } : {}),
    additional_component_profiles: arr(c.profiles).map((p) => ({
      name: p.name ?? "",
      ...(p.materialName != null ? { material_name: p.materialName } : {}),
      language: p.language,
    })),
    ...(img
      ? { image: { src: img.src, ...(img.src_thumbnail ? { src_thumbnail: img.src_thumbnail } : {}) } }
      : {}),
    ...(c.color
      ? {
          color: {
            id: c.color.id,
            hex: c.color.hex ?? "",
            ...(c.color.background != null ? { background: c.color.background } : {}),
          },
        }
      : {}),
    ...(c.group
      ? {
          additional_component_group: {
            id: c.group.id,
            code: c.group.code ?? "",
            additional_component_group_profiles: named(c.group.profiles),
          },
        }
      : {}),
    dimensions: c.dimensions
      ? {
          ...(c.dimensions.width != null ? { width: c.dimensions.width } : {}),
          ...(c.dimensions.height != null ? { height: c.dimensions.height } : {}),
          ...(c.dimensions.length != null ? { length: c.dimensions.length } : {}),
        }
      : null,
    is_wrapper: c.isWrapper ?? null,
    linked_components_source: arr(c.linked)
      .filter((l) => l.target)
      .map((l) => ({
        display_order: l.displayOrder ?? null,
        link_type: l.linkType,
        target_component: {
          id: l.target!.id,
          code: l.target!.code ?? null,
          image: l.target!.image
            ? {
                src: l.target!.image.src ?? null,
                src_thumbnail: l.target!.image.srcThumbnail ?? null,
              }
            : null,
          additional_component_profiles: arr(l.target!.profiles).map((p) => ({
            name: p.name ?? null,
            material_name: p.materialName ?? null,
            language: p.language,
          })),
        },
      })),
  }
}

function itemFabric(
  f: V1CartItemFabric
): FurnisystemsCartItem["cartItemFabrics"][number] {
  const img = imageSrcs(f.fabric?.image)
  return {
    id: f.id,
    fabric_code: f.fabricCode ?? null,
    fabric_color_name: f.fabricColorName ?? null,
    fabric_group_name: f.fabricGroupName ?? null,
    ...(f.fabric
      ? {
          fabric: {
            id: f.fabric.id,
            code: f.fabric.code ?? "",
            ...(f.fabric.colorName != null ? { color_name: f.fabric.colorName } : {}),
            ...(img
              ? { image: { src: img.src, ...(img.src_thumbnail ? { src_thumbnail: img.src_thumbnail } : {}) } }
              : {}),
          },
        }
      : {}),
    ...(f.fabricGroup
      ? {
          fabric_group: {
            id: f.fabricGroup.id,
            ...(f.fabricGroup.code != null ? { code: f.fabricGroup.code } : {}),
            ...(f.fabricGroup.type != null ? { type: f.fabricGroup.type } : {}),
            fabric_group_profiles: named(f.fabricGroup.profiles),
          },
        }
      : {}),
    ...(f.combinationOption
      ? {
          combination_option: {
            id: f.combinationOption.id,
            fabricCombinationOptionProfiles: named(f.combinationOption.profiles),
          },
        }
      : {}),
  }
}

// ---- responses ----

/** One v1 cart line; `cartId` from the parent cart (v1 does not serve it). */
export function mapV1CartItem(item: V1CartItem, cartId: number | null): FurnisystemsCartItem {
  const product = item.product
  const single = product?.singleProduct
  const advanced = product?.advancedProduct
  const combinationImage = imageSrcs(item.fabricCombination?.image)
  return {
    id: item.id,
    quantity: item.quantity ?? null,
    price: item.price ?? null,
    volume: item.volume ?? null,
    ...(item.reference != null ? { reference: item.reference } : {}),
    product_type: item.productType ?? "",
    advanced_product_type: item.advancedProductType ?? null,
    fabric_code: item.fabricCode ?? null,
    fabric_group_name: item.fabricGroupName ?? null,
    fabric_color_name: item.fabricColorName ?? null,
    selected_sofa_combinations: item.selectedSofaCombinations ?? null,
    components_by_module: item.componentsByModule ?? null,
    fabric: item.fabric ? { id: item.fabric.id } : null,
    fabric_group: item.fabricGroup ? { id: item.fabricGroup.id } : null,
    cartId,
    productContainerId: product?.id ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    product_container: product
      ? {
          ...(single
            ? {
                single_product: {
                  images: arr(single.images)
                    .map(imageSrcs)
                    .filter((i): i is NonNullable<typeof i> => Boolean(i)),
                  category_photo: categoryPhoto(single.categoryPhoto),
                  product_profiles: named(single.profiles),
                },
              }
            : {}),
          ...(advanced
            ? {
                advanced_product: {
                  images: arr(advanced.images)
                    .map(imageSrcs)
                    .filter((i): i is NonNullable<typeof i> => Boolean(i)),
                  category_photo: categoryPhoto(advanced.categoryPhoto),
                  advanced_product_profiles: named(advanced.profiles),
                  dimensions: dimensions(advanced.dimensions),
                },
              }
            : {}),
        }
      : null,
    additional_components: arr(item.components).map(component),
    cartItemFabrics: arr(item.fabrics).map(itemFabric),
    sofa_forms: arr(item.sofaForms).map((f) => ({
      id: f.id,
      ...(f.name != null ? { name: f.name } : {}),
      ...(f.code != null ? { code: f.code } : {}),
    })),
    fabricCombination: item.fabricCombination
      ? {
          id: item.fabricCombination.id,
          ...(combinationImage ? { image: combinationImage } : {}),
        }
      : null,
  }
}

export function mapV1Cart(cart: V1Cart): FurnisystemsCart {
  return {
    id: cart.id,
    name: cart.name ?? null,
    isActive: cart.isActive,
    isModified: cart.isModified ?? false,
    customerId: cart.customerId,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    items: arr(cart.items).map((i) => mapV1CartItem(i, cart.id)),
  }
}

export function mapV1CartSummaries(body: { data: N<V1CartSummary[]> }): CartSummary[] {
  return arr(body?.data).map((c) => ({
    id: c.id,
    name: c.name ?? null,
    isActive: c.isActive,
    isModified: c.isModified ?? false,
    updatedAt: c.updatedAt,
    itemCount: c.itemCount ?? 0,
  }))
}

/** The offer is served in the GraphQL getCartOfferData shape (camelCase already). */
export function mapV1CartOffer(body: V1CartOffer): CartOfferData {
  return {
    context: body.context,
    items: arr(body.items).map((item) => ({
      ...item,
      fabricSpecs: arr(item.fabricSpecs),
      componentSpecs: arr(item.componentSpecs),
    })),
  }
}

// ---- requests ----

const positiveId = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined
const nonEmpty = (v: unknown): string | undefined =>
  typeof v === "string" && v !== "" ? v : undefined

/**
 * POST /me/carts/:id/items body from the portal's AddCartItemInput (the
 * GraphQL addItemToCart arguments). The v1 schema is strict and its optional
 * fields reject null, so every key is OMITTED where the GraphQL call sent
 * `null` (`input.x || null`): falsy price / volume (0 is stored as null on
 * both), missing ids, empty strings. Prices are sent exactly as before.
 */
export function toV1AddCartItemBody(input: AddCartItemInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    productContainerId: input.productContainerId,
    productType: input.product_type,
  }
  const set = (key: string, value: unknown) => {
    if (value !== undefined) body[key] = value
  }
  set("advancedProductType", nonEmpty(input.advanced_product_type))
  set("quantity", positiveId(input.quantity))
  set("price", input.price ? input.price : undefined)
  set("volume", input.volume ? input.volume : undefined)
  set("fabricId", positiveId(input.fabricId))
  set("fabricGroupId", positiveId(input.fabric_groupId))
  set("fabricCombinationId", positiveId(input.fabricCombinationId))
  set("fabricCode", nonEmpty(input.fabric_code))
  set("fabricGroupName", nonEmpty(input.fabric_group_name))
  set("language", nonEmpty(input.language))
  set("selectedSofaCombinations", nonEmpty(input.selected_sofa_combinations))
  const componentIds = (input.additionalComponentIds ?? [])
    .map(positiveId)
    .filter((id): id is number => id !== undefined)
  if (componentIds.length) body.additionalComponentIds = componentIds
  const byModule = (input.componentsByModule ?? [])
    .filter((m) => positiveId(m?.additionalComponentId) !== undefined && nonEmpty(m?.groupCode))
    .map((m) => ({ additionalComponentId: m.additionalComponentId, groupCode: m.groupCode }))
  if (byModule.length) body.componentsByModule = byModule
  const fabrics = (input.cartItemFabrics ?? []).map((f) => {
    const out: Record<string, number> = {}
    const fabricId = positiveId(f?.fabricId)
    const fabricGroupId = positiveId(f?.fabric_groupId)
    const combinationOptionId = positiveId(f?.combination_optionId)
    if (fabricId !== undefined) out.fabricId = fabricId
    if (fabricGroupId !== undefined) out.fabricGroupId = fabricGroupId
    if (combinationOptionId !== undefined) out.combinationOptionId = combinationOptionId
    return out
  })
  if (fabrics.length) body.cartItemFabrics = fabrics
  set("reference", nonEmpty(input.customerReference))
  return body
}

/** GET /me/carts/:id/offer query: the booleans are the strings "true" / "false". */
export function v1CartOfferQuery(opts: {
  language: string
  showPvm?: boolean
  showVolume?: boolean
  vatRate?: number
}): Record<string, string> {
  const query: Record<string, string> = { language: opts.language }
  if (opts.showPvm !== undefined) query.showPvm = opts.showPvm ? "true" : "false"
  if (opts.showVolume !== undefined) query.showVolume = opts.showVolume ? "true" : "false"
  if (opts.vatRate !== undefined) query.vatRate = String(opts.vatRate)
  return query
}

/** A positive integer id usable in a v1 path segment, else null. */
export function v1CartPathId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647
    ? value
    : null
}
