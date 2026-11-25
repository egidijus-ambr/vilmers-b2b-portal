import { HttpTypes } from "@medusajs/types"
import ProductRail from "@modules/home/components/featured-products/product-rail"

export default async function FeaturedProducts({
  collections,
  region,
  languageCode,
}: {
  collections: HttpTypes.StoreCollection[]
  region: HttpTypes.StoreRegion
  languageCode?: string
}) {
  return collections.map((collection) => (
    <li key={collection.id}>
      <ProductRail
        collection={collection}
        region={region}
        languageCode={languageCode}
      />
    </li>
  ))
}
