import { HttpTypes } from "@medusajs/types"
import { OrderDetailItem } from "@lib/furnisystems-sdk/modules/customer/types"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"
import { ProductItemRow } from "./types"

export function cartLineItemToProductItemRow(
  item: HttpTypes.StoreCartLineItem
): ProductItemRow {
  return {
    id: item.id,
    name: item.product_title || item.title || "",
    image: item.thumbnail || undefined,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    total: item.total || item.unit_price * item.quantity,
    isAdvanced: false,
  }
}

export function orderDetailItemToProductItemRow(
  item: OrderDetailItem,
  language: string
): ProductItemRow {
  const container = item.cart_item?.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product

  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  const name = localProfile?.name || "-"

  const images = singleProduct?.images || advancedProduct?.images
  const image =
    images?.[0]?.src_xs || images?.[0]?.src_thumbnail || images?.[0]?.src || undefined

  const hasFabrics = (item.cart_item?.cartItemFabrics?.length ?? 0) > 0
  const hasComponents =
    (item.cart_item?.additional_components?.length ?? 0) > 0
  const hasConfigurations =
    Array.isArray(item.metadata?.configurations) &&
    item.metadata.configurations.length > 0
  const isAdvanced =
    !!item.cart_item?.advanced_product_type &&
    (hasFabrics || hasComponents || hasConfigurations)

  return {
    id: item.id,
    name,
    reference: item.reference,
    image,
    unitPrice: item.price,
    quantity: item.quantity,
    total: item.price * item.quantity,
    volume: item.volume,
    isAdvanced,
    orderDetailItem: item,
  }
}

export function furnisystemsCartItemToProductItemRow(
  item: FurnisystemsCartItem,
  language: string
): ProductItemRow {
  const container = item.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product

  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  const name = localProfile?.name || "-"

  const images = singleProduct?.images || advancedProduct?.images
  const image =
    images?.[0]?.src_xs || images?.[0]?.src_thumbnail || images?.[0]?.src || undefined

  const hasFabrics = (item.cartItemFabrics?.length ?? 0) > 0
  const hasComponents = (item.additional_components?.length ?? 0) > 0
  const hasSofaCombinations = !!item.selected_sofa_combinations
  const isAdvanced =
    !!item.advanced_product_type && (hasFabrics || hasComponents || hasSofaCombinations)

  // Build metadata.configurations from selected_sofa_combinations so SofaConfigurationDetail renders
  let configurations: any[] | undefined
  if (hasSofaCombinations) {
    try {
      const combos = JSON.parse(item.selected_sofa_combinations!)
      if (Array.isArray(combos)) {
        // Create one configuration entry per sofa set with empty parts
        // The Konva preview will still render from selected_sofa_combinations
        configurations = combos.map(() => [])
      }
    } catch {}
  }

  return {
    id: String(item.id),
    name,
    image,
    unitPrice: 0,
    quantity: item.quantity ?? 1,
    total: 0,
    isAdvanced,
    orderDetailItem: isAdvanced
      ? {
          cart_item: {
            advanced_product_type: item.advanced_product_type,
            selected_sofa_combinations: item.selected_sofa_combinations,
            fabric_code: item.fabric_code,
            fabric_group_name: item.fabric_group_name,
            cartItemFabrics: item.cartItemFabrics,
            product_container: item.product_container,
            additional_components: item.additional_components,
            fabricCombination: item.fabricCombination,
            sofa_forms: item.sofa_forms,
          },
          metadata: configurations ? { configurations } : {},
        }
      : undefined,
  }
}
