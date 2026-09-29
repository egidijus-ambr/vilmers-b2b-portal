import type { Photo } from "./types"
import GalleryClient from "./gallery-client"

type InteriorGallerySectionProps = {
  productName: string | null
  /**
   * Category.code list of the product. Always sent (even empty) so the backend
   * scopes strictly: product names are not unique, the category folder is.
   */
  categoryCodes: string[]
}

const InteriorGallerySection = async ({
  productName,
  categoryCodes,
}: InteriorGallerySectionProps) => {
  if (!productName) return null

  const restApiUrl = process.env.NEXT_PUBLIC_BACKEND_REST_API
  if (!restApiUrl) return null

  let photos: Photo[] = []

  try {
    const apiUrl = `${restApiUrl}/s3/product-photos/${encodeURIComponent(
      productName
    )}?categoryCodes=${encodeURIComponent(categoryCodes.join(","))}`
    const response = await fetch(apiUrl, { next: { revalidate: 300 } })
    if (response.ok) {
      const data = await response.json()
      photos = (data.photos || []).filter(
        (photo: Photo) => photo.category === "INTERIOR_PHOTOS"
      )
    }
  } catch {
    // Network error or parse failure — treat as no photos
    return null
  }

  if (photos.length === 0) return null

  return <GalleryClient photos={photos} />
}

export default InteriorGallerySection
