"use client"

import type { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import type { SupportedLanguage } from "@lib/i18n"
import { useTranslations } from "@lib/i18n"
import ProductCarouselGrid from "@modules/common/components/product-carousel-grid"

type LinkedProductGroup = {
  type: string
  products: ProductContainer[]
}

interface LinkedProductsSectionProps {
  groups: LinkedProductGroup[]
  languageCode: string
}

export default function LinkedProductsSection({
  groups,
  languageCode,
}: LinkedProductsSectionProps) {
  const { t } = useTranslations()

  if (groups.length === 0) return null

  return (
    <div className="mt-12">
      {groups.map((group) => (
        <div key={group.type} className="mb-10">
          <ProductCarouselGrid
            products={group.products}
            language={languageCode as SupportedLanguage}
            maxRows={1}
            title={t(`linked-products-${group.type}`)}
          />
        </div>
      ))}
    </div>
  )
}
