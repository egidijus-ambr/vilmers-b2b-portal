import { getCollectionProducts } from "@lib/data/collection-products"
import { SupportedLanguage, getServerT } from "@lib/i18n"
import B2BProductCard from "@modules/categories/components/category-product-card"
import ProductPagination from "@modules/store/components/product-pagination"

interface CollectionProductGridProps {
  collectionPermalink: string
  language: SupportedLanguage
  page: number
}

export default async function CollectionProductGrid({
  collectionPermalink,
  language,
  page,
}: CollectionProductGridProps) {
  const t = await getServerT("common", language)
  const { products, totalPages, totalCount } = await getCollectionProducts(
    collectionPermalink,
    language,
    page
  )

  return (
    <div data-testid="collection-product-grid">
      <div className="flex items-center justify-between mb-4">
        <p className="hidden xsmall:block text-sm text-gray-600">
          {t("products-count", { count: totalCount })}
        </p>
      </div>
      {products.length === 0 ? (
        <div
          className="flex items-center justify-center py-12"
          data-testid="no-products"
        >
          <p className="text-gray-500 text-base">No products found</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
            {products.map((container) => (
              <B2BProductCard
                key={container.id}
                container={container}
                language={language}
              />
            ))}
          </ul>

          <ProductPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={28}
          />
        </>
      )}
    </div>
  )
}
