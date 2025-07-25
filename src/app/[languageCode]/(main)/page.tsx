import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Vilmers",
  description: "Comfort and quality with smart design",
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
