"use client"

import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
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
      <div className="shadow-elevation-card-rest relative w-full bg-ui-bg-subtle">
        <Image
          src={photos[selectedImageIndex].url}
          alt={`${productName} interior photo ${selectedImageIndex + 1}`}
          width={800}
          height={600}
          priority={selectedImageIndex === 0}
          className="w-full h-auto object-contain"
          sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-2">
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
    </div>
  )
}

export default InteriorPhotoGallery
