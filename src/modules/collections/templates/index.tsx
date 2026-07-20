import { Suspense } from "react"
import { CollectionData } from "@lib/furnisystems-sdk"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import CollectionProductGrid from "@modules/collections/components/collection-product-grid"
import CategoryProductGridSkeleton from "@modules/categories/components/category-product-grid-skeleton"
import NewsletterBlock from "@modules/home/components/newsletter-block"

interface CollectionPageTemplateProps {
  collection: CollectionData
  language: string
  page: number
}

/** Get the localized name from a collection's profiles */
function getCollectionName(collection: CollectionData): string {
  return collection.collection_profiles?.[0]?.name ?? ""
}

/** Get the description from a collection's profile */
function getCollectionDescription(collection: CollectionData): string | null {
  return collection.collection_profiles?.[0]?.description ?? null
}

/** Get the permalink from a collection's profile meta_information */
function getCollectionPermalink(collection: CollectionData): string | null {
  return collection.collection_profiles?.[0]?.meta_information?.permalink ?? null
}

/**
 * Collections are flat (no parent chain), so the breadcrumb is always
 * Home → collection name (no link on the current page).
 */
function buildBreadcrumbs(collection: CollectionData): BreadcrumbItem[] {
  return [
    { label: "Home", href: "/" },
    { label: getCollectionName(collection), href: null },
  ]
}

export default async function CollectionPageTemplate({
  collection,
  language,
  page,
}: CollectionPageTemplateProps) {
  const name = getCollectionName(collection)
  const description = getCollectionDescription(collection)
  const breadcrumbs = buildBreadcrumbs(collection)
  const collectionPermalink = getCollectionPermalink(collection) || ""

  return (
    <div data-testid="collection-container">
      <PageHeader
        title={name}
        description={description}
        breadcrumbItems={breadcrumbs}
        titleSize="h2"
      />
      <div className="w-full">
        <PageContent className="pt-8">
          <Suspense fallback={<CategoryProductGridSkeleton />}>
            <CollectionProductGrid
              collectionPermalink={collectionPermalink}
              language={language as any}
              page={page}
            />
          </Suspense>
        </PageContent>
        <NewsletterBlock languageCode={language} />
      </div>
    </div>
  )
}
