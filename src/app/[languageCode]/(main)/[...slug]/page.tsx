import { Metadata } from "next"
import { notFound } from "next/navigation"

import ContentBlock from "@modules/home/components/content-block"
import PageHero from "@modules/cms/components/page-hero"
import { getPageByPath, enrichContentBlocksWithPages } from "@lib/data/pages"
import { enrichContentBlocksWithTileCategories } from "@lib/data/categories"
import { enrichContentBlocksWithProducts } from "@lib/data/products"
import { getFlipbookRenderData, FlipbookRenderData } from "@lib/data/flipbooks"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import type { PageAncestor } from "@lib/furnisystems-sdk/modules/pages/types"
import type { ContentBlockData } from "@modules/home/components/content-block/types"
import { activeThemeName } from "themes"

const brand = activeThemeName.charAt(0).toUpperCase() + activeThemeName.slice(1)

type Props = {
  params: Promise<{ languageCode: string; slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * Build ancestor breadcrumb items from the flat, root-first `ancestors` array
 * returned by the backend. Each item's href is the accumulated lang-less path
 * (LocalizedClientLink prepends the language code at render time).
 */
function buildAncestorBreadcrumbs(
  ancestors: PageAncestor[],
  languageCode: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  const accumulatedSegments: string[] = []

  for (const ancestor of ancestors) {
    const profile =
      ancestor.page_profiles.find(
        (p) => p.language?.toLowerCase() === languageCode.toLowerCase()
      ) ?? ancestor.page_profiles[0]

    const slug = profile?.slug ?? null
    if (!slug) continue

    accumulatedSegments.push(slug)
    items.push({
      label: profile?.title ?? slug,
      href: `/${accumulatedSegments.join("/")}`,
    })
  }

  return items
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const path = params.slug.join("/")
  const page = await getPageByPath(path, params.languageCode)

  if (!page) {
    return { title: "Page not found" }
  }

  const profile =
    page.page_profiles.find(
      (p) => p.language?.toLowerCase() === params.languageCode.toLowerCase()
    ) ?? page.page_profiles[0]

  return {
    title: profile?.title ?? brand,
    description: profile?.meta_description ?? undefined,
  }
}

export default async function CmsPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { languageCode, slug } = params
  const path = slug.join("/")

  const selectedTagSlug =
    typeof searchParams?.tag === "string" ? searchParams.tag : null

  const page = await getPageByPath(path, languageCode)

  if (!page) {
    notFound()
  }

  const profile =
    page.page_profiles.find(
      (p) => p.language?.toLowerCase() === languageCode.toLowerCase()
    ) ?? page.page_profiles[0]

  const heroHeightUnit = page.hero_height_unit ?? "vh"
  const heroHeight = page.hero_height_value
    ? heroHeightUnit === "vh"
      ? `calc(${page.hero_height_value}vh - var(--top-bar-height) - var(--nav-height))`
      : `${page.hero_height_value}${heroHeightUnit}`
    : null

  let contentBlocks = await enrichContentBlocksWithTileCategories(
    (page.content_blocks ?? [])
      .slice()
      .sort((a, b) => (a.arrangement ?? 0) - (b.arrangement ?? 0)),
    languageCode
  )
  contentBlocks = await enrichContentBlocksWithProducts(contentBlocks, languageCode)
  contentBlocks = await enrichContentBlocksWithPages(
    contentBlocks,
    languageCode,
    page.id,
    selectedTagSlug
  )

  // pdf_flipbook manifests must be resolved server-side: GCS sends no CORS
  // headers, so the client component can't fetch them. Keyed by block id and
  // passed down as a prop; a null entry means the block renders nothing.
  const flipbooks: Record<string, FlipbookRenderData | null> = {}
  for (const block of contentBlocks) {
    if ((block.type as string) === "pdf_flipbook") {
      const manifestUrl = (block.config as any)?.manifest_url as string | undefined
      flipbooks[String(block.id)] = manifestUrl
        ? await getFlipbookRenderData(manifestUrl)
        : null
    }
  }

  // Build breadcrumbs: Home → ancestors (root-first, published-only) → current page
  const ancestorItems = buildAncestorBreadcrumbs(page.ancestors ?? [], languageCode)

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...ancestorItems,
    { label: profile?.title ?? path, href: null },
  ]

  return (
    <>
      <PageHero
        title={profile?.title ?? null}
        subtitle={profile?.subtitle ?? null}
        heroImageSrc={page.hero_image?.src ?? null}
        heroDisplay={page.hero_display ?? "full_width"}
        heroHeight={heroHeight}
        breadcrumbItems={breadcrumbItems}
        ctaLabel={profile?.cta_label ?? null}
        ctaLink={profile?.cta_link ?? null}
        ctaLinkPage={page.cta_link_page ?? null}
        ctaLinkType={page.cta_link_type ?? null}
        ctaLinkCategory={page.cta_link_category ?? null}
        ctaNewTab={page.cta_new_tab ?? null}
        languageCode={languageCode}
      />
      {contentBlocks.length > 0 ? (
        <div>
          {contentBlocks.map((block, index) => (
            <ContentBlock
              key={block.id}
              data={block as unknown as ContentBlockData}
              index={index}
              languageCode={languageCode}
              selectedTagSlug={selectedTagSlug}
              flipbook={flipbooks[String(block.id)] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-ui-fg-subtle">This page has no content yet.</p>
        </div>
      )}
    </>
  )
}
