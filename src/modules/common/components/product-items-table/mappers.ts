import { HttpTypes } from "@medusajs/types"
import { OrderDetailItem } from "@lib/furnisystems-sdk/modules/customer/types"
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
