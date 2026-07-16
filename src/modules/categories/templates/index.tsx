import { Suspense } from "react"
import { CategoryData } from "@lib/furnisystems-sdk"
import { CategorySortOption } from "@lib/furnisystems-sdk/modules/products/types"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import CategoryProductGrid from "@modules/categories/components/category-product-grid"
import CategoryProductGridSkeleton from "@modules/categories/components/category-product-grid-skeleton"
import ContentBlock from "@modules/home/components/content-block"
import NewsletterBlock from "@modules/home/components/newsletter-block"
import ChildCategoriesCarousel from "@modules/categories/components/child-categories-carousel"
import { getCategoryFilterFacets } from "@lib/data/category-filters"

interface CategoryPageTemplateProps {
  category: CategoryData
  language: string
  page: number
  sortBy?: CategorySortOption
  attrs?: string
  cats?: string
  menuCategories?: CategoryData[]
}

/** Get the localized name from a category's profiles */
function getCategoryName(category: CategoryData): string {
  const profile = category.category_profiles?.[0]
  return profile?.name ?? ""
}

/** Get the permalink from a category's profile meta_information */
function getCategoryPermalink(category: CategoryData): string | null {
  const profile = category.category_profiles?.[0]
  return profile?.meta_information?.permalink ?? null
}

/** Get the description from a category's profile */
function getCategoryDescription(category: CategoryData): string | null {
  const profile = category.category_profiles?.[0]
  return profile?.description ?? null
}

/**
 * Build breadcrumb chain from the category's parent_category chain.
 * Returns: Home → [root category if missing] → parent's parent → parent → Current (no link)
 */
function buildBreadcrumbs(
  category: CategoryData,
  menuCategories?: CategoryData[]
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }]

  // Collect parent chain (walk up parent_category)
  const parents: CategoryData[] = []
  let current = category.parent_category
  while (current) {
    parents.push(current)
    current = current.parent_category ?? null
  }
  parents.reverse()

  // Find root category from menu data
  const rootCategory = menuCategories?.find((c) => c.is_root_category)

  // If current category is not root and root is not in parent chain, inject it
  const hasRoot =
    category.is_root_category ||
    (rootCategory && parents.some((p) => p.id === rootCategory.id))

  if (!hasRoot && rootCategory) {
    const name = getCategoryName(rootCategory)
    const permalink = getCategoryPermalink(rootCategory)
    items.push({
      label: name,
      href: permalink ? `/categories/${permalink}` : null,
    })
  }

  for (const parent of parents) {
    const name = getCategoryName(parent)
    const permalink = getCategoryPermalink(parent)
    items.push({
      label: name,
      href: permalink ? `/categories/${permalink}` : null,
    })
  }

  // Current category (no link)
  items.push({
    label: getCategoryName(category),
    href: null,
  })

  return items
}

export default async function CategoryPageTemplate({
  category,
  language,
  page,
  sortBy,
  attrs,
  cats,
  menuCategories,
}: CategoryPageTemplateProps) {
  const name = getCategoryName(category)
  const description = getCategoryDescription(category)
  const breadcrumbs = buildBreadcrumbs(category, menuCategories)
  const categoryPermalink = getCategoryPermalink(category) || ""

  // Parse attribute IDs and category IDs from URL and fetch filter facets
  const attrIds = attrs ? attrs.split(",").map(Number).filter(Boolean) : []
  const catIds = cats ? cats.split(",").map(Number).filter(Boolean) : []
  const filterFacets = await getCategoryFilterFacets(
    categoryPermalink,
    language,
    attrIds,
    catIds
  )

  const contentBlocks = (category.content_blocks ?? [])
    .slice()
    .sort((a, b) => (a.arrangement ?? 0) - (b.arrangement ?? 0))

  return (
    <div data-testid="category-container">
      <PageHeader
        title={name}
        description={description}
        breadcrumbItems={breadcrumbs}
        titleSize="h2"
      />
      <div className="w-full">
        {contentBlocks.length > 0 && (
          <div>
            {contentBlocks.map((block, index) => (
              <ContentBlock
                key={block.id}
                data={block}
                index={index}
                languageCode={language}
              />
            ))}
          </div>
        )}
        {category.is_root_category && menuCategories ? (
          <ChildCategoriesCarousel
            categories={menuCategories.filter((c) => c.id !== category.id)}
            language={language}
            languageCode={language}
          />
        ) : (category.child_categories?.length ?? 0) > 0 ? (
          <ChildCategoriesCarousel
            categories={category.child_categories ?? []}
            language={language}
            languageCode={language}
          />
        ) : null}
        <PageContent className="pt-8">
          <Suspense fallback={<CategoryProductGridSkeleton />}>
            <CategoryProductGrid
              categoryPermalink={categoryPermalink}
              language={language as any}
              page={page}
              sortBy={sortBy}
              attrIds={attrIds}
              catIds={catIds}
              filterFacets={filterFacets}
              currentCategoryId={category.id}
            />
          </Suspense>
        </PageContent>
        <NewsletterBlock languageCode={language} />
      </div>
    </div>
  )
}
