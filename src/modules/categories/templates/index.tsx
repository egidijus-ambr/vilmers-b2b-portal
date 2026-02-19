import { Suspense } from "react"
import { CategoryData } from "@lib/furnisystems-sdk"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import CategoryProductGrid from "@modules/categories/components/category-product-grid"
import CategoryProductGridSkeleton from "@modules/categories/components/category-product-grid-skeleton"
import ContentBlock from "@modules/home/components/content-block"

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

  const contentBlocks = (category.content_blocks ?? [])
    .slice()
    .sort((a, b) => (a.arrangement ?? 0) - (b.arrangement ?? 0))

  return (
    <div data-testid="category-container">
      <PageHeader
        title={name}
        description={description}
        breadcrumbItems={breadcrumbs}
      />
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
      <PageContent>
        <Suspense fallback={<CategoryProductGridSkeleton />}>
          <CategoryProductGrid
            categoryPermalink={getCategoryPermalink(category) || ""}
            language={language as any}
            page={page}
          />
        </Suspense>
      </PageContent>
    </div>
  )
}
