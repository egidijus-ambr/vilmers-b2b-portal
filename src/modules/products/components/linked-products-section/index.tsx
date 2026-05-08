"use client"

import type { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import type { SupportedLanguage } from "@lib/i18n"
import { useTranslations } from "@lib/i18n"
import ProductCarouselGrid from "@modules/common/components/product-carousel-grid"
import ProductSection from "@modules/products/components/product-section"

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
    <ProductSection>
      {groups.map((group) => (
        <div key={group.type} className="mb-10">
          <ProductCarouselGrid
            products={group.products}
            language={languageCode as SupportedLanguage}
            maxRows={1}
            title={t(`linked-products-${group.type}`)}
            titleClassName="text-sm font-medium uppercase tracking-[0.2em]"
            imageBackgroundClass="bg-gold-10"
          />
        </div>
      ))}
    </ProductSection>
  )
}
