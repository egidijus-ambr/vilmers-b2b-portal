import React from "react"
import { getServerT } from "@lib/i18n/server-translations"
import type { SupportedLanguage } from "@lib/i18n"
import type { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"
import { CatalogDownloadIcon } from "@modules/common/icons/catalog-download"
import ProductSection from "@modules/products/components/product-section"

type ProductDownloadsSectionProps = {
  catalogues: CatalogueFile[]
  languageCode: string
}

const ProductDownloadsSection = async ({
  catalogues,
  languageCode,
}: ProductDownloadsSectionProps) => {
  if (!catalogues || catalogues.length === 0) {
    return null
  }

  const t = await getServerT("common", languageCode as SupportedLanguage)

  const sortedCatalogues = [...catalogues].sort((a, b) =>
    (a.market ?? "").localeCompare(b.market ?? "", "en")
  )

  return (
    <ProductSection title={t("downloads")} divider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedCatalogues.map((catalogue) => (
          <a
            key={`${catalogue.url}-${catalogue.market}`}
            href={catalogue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-row items-center gap-4"
          >
            <CatalogDownloadIcon className="w-6 h-6 flex-shrink-0 text-gold" />
            <span className="font-bold text-dark-blue text-sm leading-tight">
              {catalogue.filename}
            </span>
          </a>
        ))}
      </div>
    </ProductSection>
  )
}

export default ProductDownloadsSection
