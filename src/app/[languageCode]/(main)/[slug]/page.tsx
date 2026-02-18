import { Metadata } from "next"
import { notFound } from "next/navigation"

import ContentBlock from "@modules/home/components/content-block"
import PageHero from "@modules/cms/components/page-hero"
import { getPageBySlug } from "@lib/data/pages"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"

type Props = {
  params: Promise<{ languageCode: string; slug: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const page = await getPageBySlug(params.slug, params.languageCode)

  if (!page) {
    return { title: "Page not found" }
  }

  const profile = page.page_profiles.find(
    (p) => p.language?.toLowerCase() === params.languageCode.toLowerCase()
  ) ?? page.page_profiles[0]

  return {
    title: profile?.title ?? "Vilmers",
    description: profile?.meta_description ?? undefined,
  }
}

export default async function CmsPage(props: Props) {
  const params = await props.params
  const { languageCode, slug } = params

  const page = await getPageBySlug(slug, languageCode)

  if (!page) {
    notFound()
  }

  const profile = page.page_profiles.find(
    (p) => p.language?.toLowerCase() === languageCode.toLowerCase()
  ) ?? page.page_profiles[0]

  const contentBlocks = (page.content_blocks ?? [])
    .slice()
    .sort((a, b) => (a.arrangement ?? 0) - (b.arrangement ?? 0))

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: profile?.title ?? slug, href: null },
  ]

  return (
    <>
      <PageHero
        title={profile?.title ?? null}
        subtitle={profile?.subtitle ?? null}
        heroImageSrc={page.hero_image?.src ?? null}
        breadcrumbItems={breadcrumbItems}
      />
      {contentBlocks.length > 0 ? (
        <div>
          {contentBlocks.map((block, index) => (
            <ContentBlock
              key={block.id}
              data={block}
              index={index}
              languageCode={languageCode}
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
