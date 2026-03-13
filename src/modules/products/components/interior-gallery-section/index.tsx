"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogPanel } from "@headlessui/react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

type ApiPhoto = {
  url: string
  name: string
  category: string
  combination: string | null
  fabric: string | null
}

type InteriorGallerySectionProps = {
  productName: string | null
}

const IMAGES_PER_PAGE = 8

const navigate = (direction: "prev" | "next", total: number, current: number) =>
  direction === "prev" ? (current - 1 + total) % total : (current + 1) % total

const InteriorGallerySection: React.FC<InteriorGallerySectionProps> = ({
  productName,
}) => {
  const [photos, setPhotos] = useState<ApiPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!productName) return
    const restApiUrl = process.env.NEXT_PUBLIC_BACKEND_REST_API
    if (!restApiUrl) return

    const controller = new AbortController()

    const fetchPhotos = async () => {
      setIsLoading(true)
      try {
        const apiUrl = `${restApiUrl}/s3/product-photos/${encodeURIComponent(
          productName
        )}`
        const response = await fetch(apiUrl, { signal: controller.signal })
        if (response.ok) {
          const data = await response.json()
          const interiorPhotos = (data.photos || []).filter(
            (photo: ApiPhoto) => photo.category === "INTERIOR_PHOTOS"
          )
          setPhotos(interiorPhotos)
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        console.error("Failed to fetch interior photos:", error)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchPhotos()
    return () => controller.abort()
  }, [productName])

  const totalPages = Math.ceil(photos.length / IMAGES_PER_PAGE)
  const currentPagePhotos = photos.slice(
    page * IMAGES_PER_PAGE,
    (page + 1) * IMAGES_PER_PAGE
  )

  const handlePageNav = useCallback(
    (direction: "prev" | "next") => {
      setLoadedImages(new Set())
      setPage((p) => navigate(direction, totalPages, p))
    },
    [totalPages]
  )

  const handleImageLoaded = useCallback((url: string) => {
    setLoadedImages((prev) => new Set(prev).add(url))
  }, [])

  const openLightbox = useCallback((globalIndex: number) => {
    setLightboxIndex(globalIndex)
    setLightboxImageLoading(true)
    setLightboxOpen(true)
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => navigate("prev", photos.length, i))
        setLightboxImageLoading(true)
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((i) => navigate("next", photos.length, i))
        setLightboxImageLoading(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxOpen, photos.length])

  if (!isLoading && photos.length === 0) return null

  return (
    <div className="mt-8 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em]">
          Gallery
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageNav("prev")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => handlePageNav("next")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: IMAGES_PER_PAGE }).map((_, idx) => (
              <div
                key={idx}
                className="relative aspect-[4/3] rounded-sm bg-gold-10 animate-pulse"
              />
            ))
          : currentPagePhotos.map((photo, idx) => {
              const globalIndex = page * IMAGES_PER_PAGE + idx
              const isLoaded = loadedImages.has(photo.url)
              return (
                <button
                  key={photo.url}
                  onClick={() => openLightbox(globalIndex)}
                  className="relative aspect-[4/3] overflow-hidden rounded-sm cursor-pointer group bg-gray-100"
                >
                  <Image
                    src={photo.url}
                    alt={photo.name || `Interior photo ${globalIndex + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-500 group-hover:scale-105 ${
                      isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ transitionDelay: `${idx * 100}ms` }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    onLoad={() => handleImageLoaded(photo.url)}
                  />
                </button>
              )
            })}
      </div>

      {/* Lightbox */}
      {photos.length > 0 && (
        <Dialog
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/90" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center">
            <DialogPanel className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="fixed top-3 right-3 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Main lightbox image */}
              <div
                className="relative w-full h-full"
                style={{ padding: "2.5rem 1rem 2rem" }}
              >
                {lightboxImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                )}
                <Image
                  src={photos[lightboxIndex]?.url ?? photos[0].url}
                  alt={`Interior photo ${lightboxIndex + 1} of ${
                    photos.length
                  }`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  quality={95}
                  priority
                  onLoad={() => setLightboxImageLoading(false)}
                />
              </div>

              {/* Prev/Next arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setLightboxIndex((i) =>
                        navigate("prev", photos.length, i)
                      )
                      setLightboxImageLoading(true)
                    }}
                    className="fixed left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-7 h-7 text-white" />
                  </button>
                  <button
                    onClick={() => {
                      setLightboxIndex((i) =>
                        navigate("next", photos.length, i)
                      )
                      setLightboxImageLoading(true)
                    }}
                    className="fixed right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-7 h-7 text-white" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export default InteriorGallerySection
