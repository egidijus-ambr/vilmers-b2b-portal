import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

export const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

export function getItemName(
  item: FurnisystemsCartItem,
  language: string
): string {
  const container = item.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product
  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  return localProfile?.name || "-"
}

export function getItemImage(item: FurnisystemsCartItem): string | undefined {
  const container = item.product_container
  const categoryPhoto =
    container?.single_product?.category_photo ||
    container?.advanced_product?.category_photo
  if (categoryPhoto) {
    return (
      categoryPhoto.src_thumbnail ||
      categoryPhoto.src_xs ||
      categoryPhoto.src ||
      undefined
    )
  }
  const images =
    container?.single_product?.images || container?.advanced_product?.images
  return (
    images?.[0]?.src_thumbnail ||
    images?.[0]?.src_xs ||
    images?.[0]?.src ||
    undefined
  )
}
