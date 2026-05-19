import type { Photo } from "./types"
import GalleryClient from "./gallery-client"

type InteriorGallerySectionProps = {
  productName: string | null
}

const InteriorGallerySection = async ({
  productName,
}: InteriorGallerySectionProps) => {
  if (!productName) return null

  const restApiUrl = process.env.NEXT_PUBLIC_BACKEND_REST_API
  if (!restApiUrl) return null

  let photos: Photo[] = []

  try {
    const apiUrl = `${restApiUrl}/s3/product-photos/${encodeURIComponent(productName)}`
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
