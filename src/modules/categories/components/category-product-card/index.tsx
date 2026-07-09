"use client"

import Image from "next/image"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import { formatPrice } from "@lib/util/money"
import { SupportedLanguage } from "@lib/i18n"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PdfCatalogueButton from "@modules/categories/components/pdf-catalogue-button"
import SelectionCheckbox from "@modules/categories/components/catalog-builder/selection-checkbox"
import { useCatalogBuilder } from "@lib/context/catalog-builder-context"
import { useCustomer } from "@lib/context/customer-context"
import { useGoToConfigurator } from "@lib/context/go-to-configurator-context"
import { getCustomerMarket } from "@lib/util/customer-market"
import { features } from "@lib/features"

function extractProductDisplayData(
  container: ProductContainer,
  language: SupportedLanguage
) {
  const isAdvanced =
    container.type === "AdvancedProduct" || !!container.advanced_product

  const categoryName =
    container.primary_category?.category_profiles?.find(
      (p) => p.language === language
    )?.name ??
    container.primary_category?.category_profiles?.[0]?.name ??
    null

  if (isAdvanced && container.advanced_product) {
    const product = container.advanced_product
    const profile =
      product.advanced_product_profiles?.find((p) => p.language === language) ||
      product.advanced_product_profiles?.[0]
    const image = product.category_photo

    return {
      name: profile?.name ?? "",
      reference: container.reference ?? null,
      handle: profile?.meta_information?.permalink ?? null,
      image: image?.src_md || image?.src || null,
      priceLabel: formatPrice({
        amount: product.price_from,
        language,
      }),
      isFromPrice: true,
      isAdvanced,
      categoryName,
    }
  }

  // Single product
  const product = container.single_product
  if (!product)
    return {
      name: "",
      reference: null,
      handle: null,
      image: null,
      priceLabel: "",
      isFromPrice: false,
      isAdvanced,
      categoryName,
    }

  const profile =
    product.product_profiles?.find((p) => p.language === language) ||
    product.product_profiles?.[0]
  const image = product.category_photo

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
    reference: container.reference ?? null,
    handle: profile?.meta_information?.permalink ?? null,
    image: image?.src_md || image?.src || null,
    priceLabel: formatPrice({ amount: price, language }),
    isFromPrice: false,
    isAdvanced,
    categoryName,
  }
}

interface B2BProductCardProps {
  container: ProductContainer
  language: SupportedLanguage
  cardClassName?: string
  imageBackgroundClass?: string
}

export default function B2BProductCard({
  container,
  language,
  cardClassName,
  imageBackgroundClass,
}: B2BProductCardProps) {
  const { name, handle, image, priceLabel, isFromPrice, isAdvanced, categoryName } =
    extractProductDisplayData(container, language)

  const { enabled: goToConfigurator } = useGoToConfigurator()
  const catalogBuilder = useCatalogBuilder()
  const inSelectionMode = !!catalogBuilder?.selectionMode
  const hasCatalogues = (catalogBuilder?.catalogueMap[name] ?? []).length > 0
  const { customer } = useCustomer()
  const customerMarket = getCustomerMarket(customer)
  const catalogues = catalogBuilder?.catalogueMap[name] ?? []
  const marketCodes = Array.from(new Set(catalogues.map((c) => c.market)))

  const configuratorEnabled = features.configurator

  const href =
    inSelectionMode || !handle
      ? null
      : goToConfigurator && isAdvanced && configuratorEnabled
      ? `/products/${handle}/configurator`
      : `/products/${handle}`

  const handleCardClick = (e: React.MouseEvent) => {
    if (inSelectionMode && hasCatalogues) {
      e.preventDefault()
      e.stopPropagation()
      catalogBuilder?.toggleProduct(name)
    }
  }

  return (
    <li
      className={`group relative${inSelectionMode ? " cursor-pointer" : ""}${
        cardClassName ? ` ${cardClassName}` : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Top-right overlay: checkbox in selection mode, PDF icon otherwise */}
      <div className="absolute top-3 right-3 z-10">
        {inSelectionMode ? (
          <SelectionCheckbox productName={name} />
        ) : (
          <PdfCatalogueButton productName={name} />
        )}
      </div>

      <LocalizedClientLink
        href={href}
        className="flex flex-col gap-2 no-underline"
      >
        <div
          className={`relative aspect-[325/380] w-full overflow-hidden ${
            imageBackgroundClass ?? "bg-product-card-background"
          }`}
        >
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
          {categoryName && (
            <span className="absolute top-3 left-3 z-10 rounded-full bg-gold-30 px-3 py-2 text-sm text-dark-blue ">
              {categoryName}
            </span>
          )}
          {inSelectionMode && marketCodes.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1">
              {marketCodes.map((code) => (
                <span
                  key={code}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    customerMarket && code === customerMarket
                      ? "bg-gold text-white"
                      : "bg-white/80 text-gray-600 border border-gray-300"
                  }`}
                >
                  {code}
                </span>
              ))}
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
