import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import ContentBlock from "@modules/home/components/content-block"
import NewsletterBlock from "@modules/home/components/newsletter-block"
import type { ContentBlockData } from "@modules/home/components/content-block/types"
import ShopSettingsTest from "@modules/common/components/shop-settings-test"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { getShopSettings } from "@lib/data/shop-settings"
import { getPageByCode, enrichContentBlocksWithPages } from "@lib/data/pages"
import { enrichContentBlocksWithTileCategories } from "@lib/data/categories"
import { enrichContentBlocksWithProducts } from "@lib/data/products"
import { activeThemeName } from "themes"

export async function generateMetadata(props: {
  params: Promise<{ languageCode: string }>
}): Promise<Metadata> {
  const { languageCode } = await props.params
  const shopSettings = await getShopSettings(languageCode)
  const brand =
    shopSettings?.default_manufacturer?.company_name?.trim() ||
    activeThemeName.charAt(0).toUpperCase() + activeThemeName.slice(1)
  const ogImage = shopSettings?.default_meta_image?.src
  const description =
    "Discover premium furniture and home solutions for your business."

  return {
    title: { absolute: brand },
    description,
    keywords: ["furniture", "home design", "comfort", "quality", "smart design"],
    openGraph: {
      title: brand,
      description,
      type: "website",
      locale: "en_US",
      siteName: brand,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: brand,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: brand,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function Home(props: {
  params: Promise<{ languageCode: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  const { languageCode } = params

  const selectedTagSlug =
    typeof searchParams?.tag === "string" ? searchParams.tag : null

  const [{ collections }, shopSettings, homePage] = await Promise.all([
    listCollections({ fields: "id, handle, title" }),
    getShopSettings(languageCode),
    getPageByCode("home-page", languageCode),
  ])

  let contentBlocks = await enrichContentBlocksWithTileCategories(
    (
      homePage?.content_blocks ??
      shopSettings?.homepage_content_blocks ??
      []
    )
      .slice()
      .sort((a, b) => (a.arrangement ?? 0) - (b.arrangement ?? 0)),
    languageCode
  )
  contentBlocks = await enrichContentBlocksWithProducts(contentBlocks, languageCode)
  contentBlocks = await enrichContentBlocksWithPages(
    contentBlocks,
    languageCode,
    undefined,
    selectedTagSlug
  )

  const homePageProfile = homePage?.page_profiles?.find(
    (profile) => profile.language?.toLowerCase() === languageCode?.toLowerCase()
  )

  const heroHeight = homePage?.hero_height_value
    ? `${homePage.hero_height_value}${homePage.hero_height_unit ?? "vh"}`
    : null

  // Always render Hero, make FeaturedProducts conditional
  return (
    <>
      <Hero
        params={props.params}
        heroImageSrc={homePage?.hero_image?.src ?? null}
        title={homePageProfile?.title ?? null}
        subtitle={homePageProfile?.subtitle ?? null}
        heroHeight={heroHeight}
        heroVideoSrc={homePage?.hero_video_link ?? null}
        ctaLabel={homePageProfile?.cta_label ?? null}
        ctaLink={homePageProfile?.cta_link ?? null}
        ctaLinkPage={homePage?.cta_link_page ?? null}
        ctaLinkType={homePage?.cta_link_type ?? null}
        ctaLinkCategory={homePage?.cta_link_category ?? null}
        ctaNewTab={homePage?.cta_new_tab ?? null}
        languageCode={languageCode}
      />

      {contentBlocks.length > 0 && (
        <div>
          {contentBlocks.map((block, index) => (
            <ContentBlock
              key={block.id}
              data={block as unknown as ContentBlockData}
              index={index}
              languageCode={languageCode}
              selectedTagSlug={selectedTagSlug}
            />
          ))}
        </div>
      )}

      <NewsletterBlock languageCode={languageCode} />

      {/* {collections && region ? (
        <div className="py-0">
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p>Loading products...</p>
          {!region && (
            <p>Debug: Region not found for country code: {countryCode}</p>
          )}
          {!collections && <p>Debug: Collections not loaded</p>}
        </div>
      )}*/}
    </>
  )
}
