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
import { features } from "@lib/features"

export const metadata: Metadata = {
  title: "Vilmers - Comfort and Quality with Smart Design",
  description:
    "Discover premium furniture and home solutions with Vilmers. Experience comfort and quality with smart design for your home and office.",
  keywords: [
    "furniture",
    "home design",
    "comfort",
    "quality",
    "smart design",
    "Vilmers",
  ],
  openGraph: {
    title: "Vilmers - Comfort and Quality with Smart Design",
    description:
      "Discover premium furniture and home solutions with Vilmers. Experience comfort and quality with smart design for your home and office.",
    type: "website",
    locale: "en_US",
    siteName: "Vilmers",
    images: [
      {
        url: "https://storage.googleapis.com/furnisystems-main-bucket/furnisystems-cmcxir0x60001u2f9ch58h2ey.png",
        width: 1200,
        height: 630,
        alt: "Vilmers - Premium Furniture and Home Solutions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vilmers - Comfort and Quality with Smart Design",
    description:
      "Discover premium furniture and home solutions with Vilmers. Experience comfort and quality with smart design for your home and office.",
    images: [
      "https://storage.googleapis.com/furnisystems-main-bucket/furnisystems-cmcxir0x60001u2f9ch58h2ey.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
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

  // Always render Hero, make FeaturedProducts conditional
  return (
    <>
      <Hero params={props.params} />

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

      {features.newsletter && (
        <NewsletterBlock languageCode={languageCode} />
      )}

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
