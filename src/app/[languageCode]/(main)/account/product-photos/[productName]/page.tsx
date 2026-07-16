import { Metadata } from "next"
import { sdk } from "@lib/config"
import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
import ProductPhotosContent from "./product-photos-content"
import { activeThemeName } from "themes"

const brand = activeThemeName.charAt(0).toUpperCase() + activeThemeName.slice(1)

type Props = {
  params: Promise<{ productName: string; languageCode: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productName } = await params
  const decodedProductName = decodeURIComponent(productName)

  try {
    const response = await sdk.productPhotos.getProductPhotos(decodedProductName)

    const firstPhoto = response.photos.find(
      (photo: ProductPhoto) =>
        photo.mediaType !== "video" && photo.category === "INTERIOR_PHOTOS"
    )

    if (firstPhoto?.url) {
      return {
        title: decodedProductName,
        openGraph: {
          images: [
            {
              url: firstPhoto.url,
              width: 1200,
              height: 630,
              alt: `${decodedProductName} - ${brand}`,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          images: [firstPhoto.url],
        },
      }
    }
  } catch {
    // If fetch fails, fall back to default metadata without OG images
  }

  return {
    title: decodedProductName,
  }
}

export default function ProductPhotoDetailPage() {
  return <ProductPhotosContent />
}
