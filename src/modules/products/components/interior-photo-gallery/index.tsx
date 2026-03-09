"use client"

import { ProductPhoto } from "@lib/furnisystems-sdk/modules/product-photos/types"
import DownloadPhotosButton from "@modules/products/components/download-photos-button"
import Image, { getImageProps } from "next/image"
import { useState, useEffect, useRef } from "react"

type InteriorPhotoGalleryProps = {
  photos: ProductPhoto[]
  productName: string
}

const isNewPhoto = (dateStr?: string | null): boolean => {
  if (!dateStr) return false
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(dateStr) > thirtyDaysAgo
}

const InteriorPhotoGallery = ({
  photos,
  productName,
}: InteriorPhotoGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(800)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = (photo: ProductPhoto) => photo.mediaType === "video"

  // Find a matching image to use as video thumbnail (same filename, different extension)
  const getVideoThumbnailUrl = (video: ProductPhoto): string | null => {
    const nameWithoutExt = video.name.replace(/\.[^/.]+$/, "")
    const match = photos.find(
      (p) =>
        p.mediaType !== "video" &&
        p.name.replace(/\.[^/.]+$/, "") === nameWithoutExt
    )
    return match?.url ?? null
  }

  // Build a set of image URLs that are used as video thumbnails
  const videoThumbnailUrls = new Set(
    photos
      .filter(isVideo)
      .map(getVideoThumbnailUrl)
      .filter((url): url is string => Boolean(url))
  )

  // Filter out images that are used as video thumbnails
  const displayPhotos = photos.filter(
    (photo) => !videoThumbnailUrls.has(photo.url)
  )

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

  const getPreloadUrl = (photoUrl: string): string => {
    const { props } = getImageProps({
      src: photoUrl,
      alt: "",
      width: containerWidth || 800,
      height: Math.round((containerWidth || 800) * 0.75),
      sizes: getResponsiveSizes(),
      quality: 85,
    })
    return props.src
  }

  if (!displayPhotos.length) {
    return (
      <div className="flex items-center justify-center p-8 text-ui-fg-muted">
        <p>No interior photos available for {productName}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main Image Display */}
      {/* Thumbnails */}
      {displayPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-0">
          {displayPhotos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              onMouseEnter={() => {
                // Preload image on hover for faster loading
                if (index !== selectedImageIndex && !isVideo(photo)) {
                  const img = new window.Image()
                  img.src = getPreloadUrl(photo.url)
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
              {isVideo(photo) ? (
                <>
                  {(() => {
                    const thumbUrl = getVideoThumbnailUrl(photo)
                    return thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt={`${productName} video thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 64px, (max-width: 1024px) 80px, 96px"
                        quality={75}
                      />
                    ) : (
                      <div className="w-full h-full bg-ui-bg-subtle" />
                    )
                  })()}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </>
              ) : (
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
              )}
              {isNewPhoto(photo.created_at) && (
                <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </button>
          ))}

          {/* Download all photos button as last thumbnail */}
          {/* <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
            <DownloadPhotosButton
              productName={productName}
              photoCount={photos.length}
            />
          </div> */}
        </div>
      )}
      <div
        ref={containerRef}
        className="relative w-full max-h-[75vh] flex items-start overflow-hidden"
      >
        {isVideo(displayPhotos[selectedImageIndex]) ? (
          <video
            ref={videoRef}
            key={displayPhotos[selectedImageIndex].url}
            src={displayPhotos[selectedImageIndex].url}
            className="w-full h-full max-h-[75vh] object-contain cursor-pointer"
            onClick={() => {
              const v = videoRef.current
              if (v) {
                v.paused ? v.play() : v.pause()
              }
            }}
            autoPlay
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={displayPhotos[selectedImageIndex].url}
            alt={`${productName} interior photo ${selectedImageIndex + 1}`}
            width={containerWidth || 800}
            height={Math.round((containerWidth || 800) * 0.75)}
            priority={selectedImageIndex === 0}
            className="w-full h-full max-h-[75vh] object-contain"
            sizes={getResponsiveSizes()}
            quality={85}
          />
        )}
      </div>
    </div>
  )
}

export default InteriorPhotoGallery
