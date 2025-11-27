"use client"

import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"

type InteriorPhotoGalleryProps = {
  photos: ProductPhoto[]
  productName: string
}

const InteriorPhotoGallery = ({
  photos,
  productName,
}: InteriorPhotoGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(800)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container size for responsive image sizing
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerWidth(Math.round(rect.width))
      }
    }

    updateContainerWidth()
    window.addEventListener("resize", updateContainerWidth)

    return () => window.removeEventListener("resize", updateContainerWidth)
  }, [])

  // Generate responsive sizes attribute based on actual container and breakpoints
  const getResponsiveSizes = () => {
    const pixelDensityMultiplier =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const baseWidth = Math.min(containerWidth, 1200) // Cap max width

    return [
      // Mobile: full width minus padding (accounting for high-DPI)
      `(max-width: 640px) ${Math.round(baseWidth * pixelDensityMultiplier)}px`,
      // Tablet: container width with some margin (accounting for high-DPI)
      `(max-width: 1024px) ${Math.round(
        baseWidth * 0.9 * pixelDensityMultiplier
      )}px`,
      // Desktop: full container width (accounting for high-DPI)
      `${Math.round(baseWidth * pixelDensityMultiplier)}px`,
    ].join(", ")
  }

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
      <div
        ref={containerRef}
        className="shadow-elevation-card-rest relative w-full bg-ui-bg-subtle "
      >
        <Image
          src={photos[selectedImageIndex].url}
          alt={`${productName} interior photo ${selectedImageIndex + 1}`}
          width={containerWidth || 800}
          height={Math.round((containerWidth || 800) * 0.75)} // 4:3 aspect ratio fallback
          priority={selectedImageIndex === 0}
          className="w-full h-auto object-contain"
          sizes={getResponsiveSizes()}
          quality={85}
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              onMouseEnter={() => {
                // Preload image on hover for faster loading
                if (index !== selectedImageIndex) {
                  const img = new window.Image()
                  img.src = photo.url
                }
              }}
              className={`
                relative flex-shrink-0 w-16 h-16 overflow-hidden border-2 rounded-sm
                ${
                  index === selectedImageIndex
                    ? "border-ui-fg-base shadow-md"
                    : "border-transparent hover:border-ui-fg-muted"
                }
                transition-all duration-200 hover:shadow-sm
              `}
            >
              <Image
                src={photo.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover transition-opacity duration-200"
                sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
                quality={75}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyLli121fCR+hj9D8ApqOT3rpSABB7cAH0qNKJa2cTFgqLm4Pym9R9sQQgOLCWqP1yM/gx4rl9c3hP/AFWXLjKs6d2jLH9Dgik0hKD5a+EsBdGhU0WhtRvfzDUnJVJVJWxzQlbQjjJF5k8sVxJXKKHUGdKXGV8yTr3D/9k="
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default InteriorPhotoGallery
