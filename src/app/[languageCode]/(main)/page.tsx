import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import ShopSettingsTest from "@modules/common/components/shop-settings-test"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

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
}) {
  const params = await props.params

  const { languageCode } = params

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  // Always render Hero, make FeaturedProducts conditional
  return (
    <>
      <Hero params={props.params} />
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
