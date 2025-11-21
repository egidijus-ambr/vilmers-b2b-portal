"use client"

import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
import { Container } from "@medusajs/ui"
import Image from "next/image"
import { useState } from "react"

type InteriorPhotoGalleryProps = {
  photos: ProductPhoto[]
  productName: string
}

const InteriorPhotoGallery = ({
  photos,
  productName,
}: InteriorPhotoGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (!photos.length) {
    return (
      <div className="flex items-center justify-center p-8 text-ui-fg-muted">
        <p>No interior photos available for {productName}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Display */}
      <Container className="relative aspect-[4/3] w-full overflow-hidden bg-ui-bg-subtle">
        <Image
          src={photos[selectedImageIndex].url}
          alt={`${productName} interior photo ${selectedImageIndex + 1}`}
          fill
          priority={selectedImageIndex === 0}
          className="object-cover"
          sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        />
      </Container>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`
                relative flex-shrink-0 w-16 h-16 overflow-hidden  border-2 
                ${
                  index === selectedImageIndex
                    ? "border-ui-fg-base shadow-md"
                    : "border-transparent hover:border-ui-fg-muted"
                }
                transition-all duration-200
              `}
            >
              <Image
                src={photo.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Photo Count */}
      <div className="text-sm text-ui-fg-muted text-center">
        {photos.length > 1 && (
          <span>
            {selectedImageIndex + 1} of {photos.length} interior photos
          </span>
        )}
        {photos.length === 1 && <span>1 interior photo</span>}
      </div>

      {/* Photo Details */}
      {photos[selectedImageIndex].variant && (
        <div className="text-xs text-ui-fg-subtle text-center">
          Variant: {photos[selectedImageIndex].variant}
        </div>
      )}
    </div>
  )
}

export default InteriorPhotoGallery
