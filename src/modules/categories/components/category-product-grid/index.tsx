import { getCategoryProducts } from "@lib/data/category-products"
import { CategorySortOption } from "@lib/furnisystems-sdk/modules/products/types"
import { SupportedLanguage, getServerT } from "@lib/i18n"
import B2BProductCard from "@modules/categories/components/category-product-card"
import CategorySortSelect from "@modules/categories/components/category-sort-select"
import ProductPagination from "@modules/store/components/product-pagination"
import ProductFilterModal from "@modules/categories/components/product-filter-modal"
import CatalogBuilderToolbar from "@modules/categories/components/catalog-builder/toolbar"
import CatalogBuilderWrapper from "./catalog-builder-wrapper"
import type {
  FilterFacetGroup,
  FilterFacetCategory,
} from "@lib/furnisystems-sdk/modules/filters/types"

interface CategoryProductGridProps {
  categoryPermalink: string
  language: SupportedLanguage
  page: number
  sortBy?: CategorySortOption
  attrIds?: number[]
  catIds?: number[]
  filterFacets?: {
    attributeGroups: FilterFacetGroup[]
    childCategories: FilterFacetCategory[]
    totalCount: number
  }
  currentCategoryId?: number
}

export default async function CategoryProductGrid({
  categoryPermalink,
  language,
  page,
  sortBy,
  attrIds,
  catIds,
  filterFacets,
  currentCategoryId,
}: CategoryProductGridProps) {
  const t = await getServerT("common", language)
  const { products, totalPages, totalCount } = await getCategoryProducts(
    categoryPermalink,
    language,
    page,
    sortBy,
    attrIds,
    catIds
  )

  // Extract product name + reference pairs for the CatalogBuilderProvider batch lookup.
  // Mirrors the name resolution logic in B2BProductCard / extractProductDisplayData.
  const productRefs = products
    .map((container) => {
      if (container.type === "AdvancedProduct" || !!container.advanced_product) {
        const profiles = container.advanced_product?.advanced_product_profiles
        const name =
          profiles?.find((p) => p.language === language)?.name ??
          profiles?.[0]?.name ??
          ""
        return { name, reference: container.reference ?? null }
      }
      const profiles = container.single_product?.product_profiles
      const name =
        profiles?.find((p) => p.language === language)?.name ??
        profiles?.[0]?.name ??
        ""
      return { name, reference: container.reference ?? null }
    })
    .filter((p) => Boolean(p.name))

  return (
    <div data-testid="category-product-grid">
      <div className="flex items-center justify-between mb-4">
        <p className="hidden xsmall:block text-sm text-gray-600">
          {t("products-count", { count: totalCount })}
        </p>
        <div className="flex flex-col items-end gap-3 ml-auto xsmall:flex-row xsmall:items-center xsmall:ml-0">
          <CatalogBuilderToolbar />
          <div className="flex items-center gap-x-3">
            <ProductFilterModal
              initialFacets={
                filterFacets || {
                  attributeGroups: [],
                  childCategories: [],
                  totalCount,
                }
              }
              language={language}
              labels={{
                filter: t("filter"),
                clearAll: t("clear-filters"),
                showResults: t("show-results"),
                category: t("category"),
              }}
              currentCategoryId={currentCategoryId}
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
      </div>
      {products.length === 0 ? (
        <div
          className="flex items-center justify-center py-12"
          data-testid="no-products"
        >
          <p className="text-gray-500 text-base">No products found</p>
        </div>
      ) : (
        <CatalogBuilderWrapper
          products={productRefs}
          filterKey={`${categoryPermalink}|${(attrIds ?? []).sort().join(",")}|${sortBy ?? ""}|${(catIds ?? []).sort().join(",")}`}
        >
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
        </CatalogBuilderWrapper>
      )}
    </div>
  )
}
