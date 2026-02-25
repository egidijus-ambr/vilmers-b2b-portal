import { Metadata } from "next"

import { getSearchProducts } from "@lib/data/search-products"
import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { getServerT } from "@lib/i18n/server-translations"
import B2BProductCard from "@modules/categories/components/category-product-card"
import ProductPagination from "@modules/store/components/product-pagination"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"

type Props = {
  params: Promise<{ query: string; languageCode: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const decodedQuery = decodeURIComponent(params.query)
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const t = await getServerT("common", validLanguage)

  const resultsFor = t("search-results-for", "Results for")

  return {
    title: `${resultsFor} "${decodedQuery}"`,
    description: `${resultsFor} "${decodedQuery}"`,
  }
}

export default async function SearchResultsPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const decodedQuery = decodeURIComponent(params.query)
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)
  const t = await getServerT("common", validLanguage)

  const { products, totalPages, totalCount } = await getSearchProducts(
    decodedQuery,
    validLanguage,
    page
  )

  return (
    <>
      <PageHeader
        title={`${t("search-results-for", "Results for")} "${decodedQuery}"`}
        breadcrumbItems={[
          { label: "Home", href: "/" },
          { label: "Search", href: null },
        ]}
      />

      {products.length === 0 ? (
        <PageContent>
          <div
            className="flex items-center justify-center py-12"
            data-testid="no-products"
          >
            <p className="text-gray-500 text-base">
              {t("search-no-results", "No products found")}
            </p>
          </div>
        </PageContent>
      ) : (
        <PageContent>
          <div data-testid="search-product-grid">
            <p className="text-sm text-gray-600 mb-4">
              {t("search-products-count", "Products")}: {totalCount}
            </p>
            <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
              {products.map((container) => (
                <B2BProductCard
                  key={container.id}
                  container={container}
                  language={validLanguage}
                />
              ))}
            </ul>

            <ProductPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={28}
            />
          </div>
        </PageContent>
      )}
    </>
  )
}
