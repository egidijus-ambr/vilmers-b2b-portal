import { getCategoryProducts } from "@lib/data/category-products"
import { CategorySortOption } from "@lib/furnisystems-sdk/modules/products/types"
import { SupportedLanguage, getServerT } from "@lib/i18n"
import B2BProductCard from "@modules/categories/components/category-product-card"
import CategorySortSelect from "@modules/categories/components/category-sort-select"
import ProductPagination from "@modules/store/components/product-pagination"
import ProductFilterModal from "@modules/categories/components/product-filter-modal"
import type { FilterFacetGroup } from "@lib/furnisystems-sdk/modules/filters/types"
import type { CategoryData } from "@lib/furnisystems-sdk"

interface CategoryProductGridProps {
  categoryPermalink: string
  language: SupportedLanguage
  page: number
  sortBy?: CategorySortOption
  attrIds?: number[]
  filterFacets?: { attributeGroups: FilterFacetGroup[]; totalCount: number }
  childCategories?: CategoryData[]
}

export default async function CategoryProductGrid({
  categoryPermalink,
  language,
  page,
  sortBy,
  attrIds,
  filterFacets,
  childCategories,
}: CategoryProductGridProps) {
  const t = await getServerT("common", language)
  const { products, totalPages, totalCount } = await getCategoryProducts(
    categoryPermalink,
    language,
    page,
    sortBy,
    attrIds
  )

  return (
    <div data-testid="category-product-grid">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {t("products-count", { count: totalCount })}
        </p>
        <div className="flex items-center gap-x-3">
          <ProductFilterModal
            initialFacets={filterFacets || { attributeGroups: [], totalCount }}
            childCategories={childCategories || []}
            language={language}
            labels={{
              filter: t("filter"),
              clearAll: t("clear-filters"),
              showResults: t("show-results"),
              category: t("category"),
            }}
          />
          <CategorySortSelect
            labels={{
              "sort-name-asc": t("sort-name-asc"),
              "sort-name-desc": t("sort-name-desc"),
              "sort-newest": t("sort-newest"),
              "sort-oldest": t("sort-oldest"),
            }}
          />
        </div>
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
