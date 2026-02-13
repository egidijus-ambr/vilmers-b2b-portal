import { getCategoryProducts } from "@lib/data/category-products"
import { SupportedLanguage } from "@lib/i18n"
import B2BProductCard from "@modules/categories/components/category-product-card"
import { Pagination } from "@modules/store/components/pagination"

interface CategoryProductGridProps {
  categoryPermalink: string
  language: SupportedLanguage
  page: number
}

export default async function CategoryProductGrid({
  categoryPermalink,
  language,
  page,
}: CategoryProductGridProps) {
  const { products, totalPages, totalCount } = await getCategoryProducts(
    categoryPermalink,
    language,
    page
  )

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="no-products">
        <p className="text-gray-500 text-base">No products found</p>
      </div>
    )
  }

  return (
    <div data-testid="category-product-grid">
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((container) => (
          <B2BProductCard
            key={container.id}
            container={container}
            language={language}
          />
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination page={page} totalPages={totalPages} data-testid="product-pagination" />
        </div>
      )}
    </div>
  )
}
