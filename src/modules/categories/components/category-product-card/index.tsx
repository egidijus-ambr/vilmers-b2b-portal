import Image from "next/image"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import { formatPrice } from "@lib/util/money"
import { SupportedLanguage } from "@lib/i18n"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

function extractProductDisplayData(
  container: ProductContainer,
  language: SupportedLanguage
) {
  const isAdvanced =
    container.type === "AdvancedProduct" || !!container.advanced_product

  if (isAdvanced && container.advanced_product) {
    const product = container.advanced_product
    const profile =
      product.advanced_product_profiles?.find((p) => p.language === language) ||
      product.advanced_product_profiles?.[0]
    const image = [...(product.images || [])].sort(
      (a, b) => a.display_order - b.display_order
    )[0]

    return {
      name: profile?.name ?? "",
      handle: profile?.meta_information?.permalink ?? null,
      image: image?.src_md || image?.src || null,
      priceLabel: formatPrice({
        amount: product.price_from,
        language,
      }),
      isFromPrice: true,
    }
  }

  // Single product
  const product = container.single_product
  if (!product)
    return {
      name: "",
      handle: null,
      image: null,
      priceLabel: "",
      isFromPrice: false,
    }

  const profile =
    product.product_profiles?.find((p) => p.language === language) ||
    product.product_profiles?.[0]
  const image = [...(product.images || [])].sort(
    (a, b) => a.display_order - b.display_order
  )[0]

  // Apply discount if active
  let price = product.price
  if (container.discount?.active) {
    const now = new Date()
    const start = new Date(container.discount.startDate)
    const expiry = new Date(container.discount.expiryDate)
    if (now >= start && now <= expiry) {
      price = price * (1 - container.discount.discount / 100)
    }
  }

  return {
    name: profile?.name ?? "",
    handle: profile?.meta_information?.permalink ?? null,
    image: image?.src_md || image?.src || null,
    priceLabel: formatPrice({ amount: price, language }),
    isFromPrice: false,
  }
}

interface B2BProductCardProps {
  container: ProductContainer
  language: SupportedLanguage
}

export default function B2BProductCard({
  container,
  language,
}: B2BProductCardProps) {
  const { name, handle, image, priceLabel, isFromPrice } =
    extractProductDisplayData(container, language)

  return (
    <li className="group">
      <LocalizedClientLink
        href={handle ? `/products/${handle}` : null}
        className="flex flex-col gap-2 no-underline"
      >
        <div className="relative aspect-[325/380] w-full overflow-hidden bg-gold-20">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 576px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-contain object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {name}
          </h3>
        </div>
      </LocalizedClientLink>
    </li>
  )
}
