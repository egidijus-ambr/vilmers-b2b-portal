import { Suspense } from "react"
import { CategoryData } from "@lib/furnisystems-sdk"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import CategoryProductGrid from "@modules/categories/components/category-product-grid"
import CategoryProductGridSkeleton from "@modules/categories/components/category-product-grid-skeleton"

interface CategoryPageTemplateProps {
  category: CategoryData
  language: string
  page: number
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
 * Returns: Home → parent's parent → parent → Current (no link)
 */
function buildBreadcrumbs(category: CategoryData): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }]

  // Collect parent chain (walk up parent_category)
  const parents: CategoryData[] = []
  let current = category.parent_category
  while (current) {
    parents.push(current)
    current = current.parent_category ?? null
  }

  // Reverse so we go from root down
  parents.reverse()

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

export default function CategoryPageTemplate({
  category,
  language,
  page,
}: CategoryPageTemplateProps) {
  const name = getCategoryName(category)
  const description = getCategoryDescription(category)
  const breadcrumbs = buildBreadcrumbs(category)

  return (
    <div data-testid="category-container" className="px-6">
      <PageHeader
        title={name}
        description={description}
        breadcrumbItems={breadcrumbs}
      />

      <div className="content-container py-6">
        <Suspense fallback={<CategoryProductGridSkeleton />}>
          <CategoryProductGrid
            categoryPermalink={getCategoryPermalink(category) || ""}
            language={language as any}
            page={page}
          />
        </Suspense>
      </div>
    </div>
  )
}
