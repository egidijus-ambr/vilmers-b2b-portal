"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogPanel } from "@headlessui/react"
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  SlidersHorizontal,
} from "lucide-react"

export type ProductImage = {
  id: number
  src: string
  src_md: string | null
  display_order: number
}

type ApiPhoto = {
  url: string
  name: string
  category: string
  combination: string | null
  fabric: string | null
}

type DisplayImage =
  | { type: "original"; id: number; src: string; thumbnail: string }
  | {
      type: "api"
      id: string
      src: string
      thumbnail: string
      name: string
      category: string
      combination: string | null
      fabric: string | null
    }

type ProductImageGalleryProps = {
  images: ProductImage[]
  productTitle: string
  productName: string | null
}

const PRODUCT_PHOTOS_CATEGORY = "PRODUCT_PHOTOS"

function formatCategoryName(category: string): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

const ProductImageGallery = ({
  images,
  productTitle,
  productName,
}: ProductImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [imageLoading, setImageLoading] = useState(true)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(true)

  // API / expanded panel state
  const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCombination, setSelectedCombination] = useState<string | null>(
    null
  )
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null)

  // Fetch additional S3 product photos
  useEffect(() => {
    if (!productName) return
    const restApiUrl = process.env.NEXT_PUBLIC_BACKEND_REST_API
    if (!restApiUrl) return
    const controller = new AbortController()
    const fetchPhotos = async () => {
      setIsLoadingPhotos(true)
      try {
        const apiUrl = `${restApiUrl}/s3/product-photos/${encodeURIComponent(
          productName
        )}`
        const response = await fetch(apiUrl, { signal: controller.signal })
        if (response.ok) {
          const data = await response.json()
          setApiPhotos(data.photos || [])
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        console.error("Failed to fetch additional product photos:", error)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPhotos(false)
        }
      }
    }
    fetchPhotos()
    return () => controller.abort()
  }, [productName])

  // Auto-select defaults when API photos load
  useEffect(() => {
    if (!apiPhotos.length) return

    // Prefer PRODUCT_PHOTOS category if it exists; otherwise pick the first available
    const categories = Array.from(
      new Set(apiPhotos.map((p) => p.category))
    ).filter((c) => c !== PRODUCT_PHOTOS_CATEGORY)

    const productPhotosExist = apiPhotos.some(
      (p) => p.category === PRODUCT_PHOTOS_CATEGORY
    )
    const defaultCategory = productPhotosExist
      ? PRODUCT_PHOTOS_CATEGORY
      : categories[0] ?? null

    setSelectedCategory(defaultCategory)
    setSelectedCombination(null)
    setSelectedFabric(null)
    setSelectedIndex(0)
  }, [apiPhotos])

  // Auto-select first combination when category changes
  useEffect(() => {
    if (selectedCategory !== PRODUCT_PHOTOS_CATEGORY) {
      setSelectedCombination(null)
      setSelectedFabric(null)
      return
    }
    const combinations = Array.from(
      new Set(
        apiPhotos
          .filter(
            (p) => p.category === PRODUCT_PHOTOS_CATEGORY && p.combination
          )
          .map((p) => p.combination as string)
      )
    )
    setSelectedCombination(combinations[0] ?? null)
    setSelectedFabric(null)
    setSelectedIndex(0)
  }, [selectedCategory, apiPhotos])

  // Auto-select first fabric when combination changes
  useEffect(() => {
    if (!selectedCombination) {
      setSelectedFabric(null)
      return
    }
    const fabrics = Array.from(
      new Set(
        apiPhotos
          .filter(
            (p) =>
              p.category === PRODUCT_PHOTOS_CATEGORY &&
              p.combination === selectedCombination &&
              p.fabric
          )
          .map((p) => p.fabric as string)
      )
    )
    setSelectedFabric(fabrics[0] ?? null)
    setSelectedIndex(0)
  }, [selectedCombination, apiPhotos])

  // Derive category lists
  const nonProductPhotoCategories = Array.from(
    new Set(
      apiPhotos
        .filter((p) => p.category !== PRODUCT_PHOTOS_CATEGORY)
        .map((p) => p.category)
    )
  )
  const productPhotosExist = apiPhotos.some(
    (p) => p.category === PRODUCT_PHOTOS_CATEGORY
  )
  const allCategories = productPhotosExist
    ? [PRODUCT_PHOTOS_CATEGORY, ...nonProductPhotoCategories]
    : nonProductPhotoCategories

  const availableCombinations =
    selectedCategory === PRODUCT_PHOTOS_CATEGORY
      ? Array.from(
          new Set(
            apiPhotos
              .filter(
                (p) => p.category === PRODUCT_PHOTOS_CATEGORY && p.combination
              )
              .map((p) => p.combination as string)
          )
        )
      : []

  const availableFabrics =
    selectedCategory === PRODUCT_PHOTOS_CATEGORY && selectedCombination
      ? Array.from(
          new Set(
            apiPhotos
              .filter(
                (p) =>
                  p.category === PRODUCT_PHOTOS_CATEGORY &&
                  p.combination === selectedCombination &&
                  p.fabric
              )
              .map((p) => p.fabric as string)
          )
        )
      : []

  // Build the display image list depending on panel state
  const originalImages: DisplayImage[] = images.map((img) => ({
    type: "original",
    id: img.id,
    src: img.src,
    thumbnail: img.src_md || img.src,
  }))

  const filteredApiImages: DisplayImage[] = panelExpanded
    ? apiPhotos
        .filter((p) => {
          if (!selectedCategory) return false
          if (p.category !== selectedCategory) return false
          if (selectedCategory === PRODUCT_PHOTOS_CATEGORY) {
            if (selectedCombination && p.combination !== selectedCombination)
              return false
            if (selectedFabric && p.fabric !== selectedFabric) return false
          }
          return true
        })
        .map((p, index) => ({
          type: "api",
          id: `api-${index}`,
          src: p.url,
          thumbnail: p.url,
          name: p.name,
          category: p.category,
          combination: p.combination,
          fabric: p.fabric,
        }))
    : []

  const displayImages: DisplayImage[] = panelExpanded
    ? filteredApiImages.length > 0
      ? filteredApiImages
      : originalImages
    : originalImages

  // Lightbox images: use filtered API images when the panel is expanded and has results, otherwise use DB originals
  const lightboxImages =
    panelExpanded && filteredApiImages.length > 0
      ? filteredApiImages
      : originalImages

  const navigate = useCallback(
    (direction: "prev" | "next", total: number, current: number) => {
      if (direction === "prev") return (current - 1 + total) % total
      return (current + 1) % total
    },
    []
  )

  // Clamp lightboxIndex when lightboxImages length changes
  useEffect(() => {
    if (lightboxIndex >= lightboxImages.length && lightboxImages.length > 0) {
      setLightboxIndex(lightboxImages.length - 1)
    }
  }, [lightboxImages.length, lightboxIndex])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => navigate("prev", lightboxImages.length, i))
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((i) => navigate("next", lightboxImages.length, i))
      } else if (e.key === "Escape") {
        setLightboxOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxOpen, lightboxImages.length, navigate])

  // Reset loading state when the selected main image changes
  useEffect(() => {
    setImageLoading(true)
  }, [selectedIndex])

  // Reset loading state when the lightbox image changes
  useEffect(() => {
    setLightboxImageLoading(true)
  }, [lightboxIndex])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setSelectedIndex(0)
  }

  const handleCombinationSelect = (combination: string) => {
    setSelectedCombination(combination)
    setSelectedIndex(0)
  }

  const handleFabricSelect = (fabric: string) => {
    setSelectedFabric(fabric)
    setSelectedIndex(0)
  }

  const togglePanel = () => {
    setPanelExpanded((prev) => {
      if (prev) {
        // Collapsing — reset to first DB image
        setSelectedIndex(0)
      }
      return !prev
    })
  }

  const currentImage = displayImages[selectedIndex] ?? displayImages[0]

  if (!images.length && !apiPhotos.length) {
    return (
      <div className="w-full aspect-square bg-white flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div
          className="relative w-full bg-white overflow-hidden cursor-zoom-in group"
          style={{ aspectRatio: "4/3" }}
          onClick={() => {
            const idx = displayImages.indexOf(currentImage)
            openLightbox(Math.max(idx, 0))
          }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-fg-muted border-t-ui-fg-base" />
            </div>
          )}

          {currentImage ? (
            currentImage.type === "original" ? (
              <Image
                src={currentImage.src}
                alt={`${productTitle} - image ${selectedIndex + 1}`}
                fill
                priority={selectedIndex === 0}
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 60vw"
                quality={85}
                onLoad={() => setImageLoading(false)}
              />
            ) : (
              <Image
                src={currentImage.src}
                alt={`${productTitle} - ${currentImage.name}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 60vw"
                quality={85}
                onLoad={() => setImageLoading(false)}
              />
            )
          ) : images.length > 0 ? (
            <Image
              src={images[0].src}
              alt={productTitle}
              fill
              priority
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 60vw"
              quality={85}
            />
          ) : null}

          {/* Zoom hint */}
          {currentImage && (
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 rounded-full p-1.5">
              <ZoomIn className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Arrow navigation on main image */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex((i) =>
                    navigate("prev", displayImages.length, i)
                  )
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-all duration-150 opacity-0 group-hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 text-dark-blue" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIndex((i) =>
                    navigate("next", displayImages.length, i)
                  )
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-all duration-150 opacity-0 group-hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 text-dark-blue" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {!panelExpanded && displayImages.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {displayImages.map((image, index) => {
              const isSelected = index === selectedIndex
              return (
                <button
                  key={image.id}
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "relative flex-shrink-0 w-[72px] h-[72px] overflow-hidden border-2 rounded-sm transition-all duration-150 bg-white",
                    isSelected
                      ? "border-dark-blue shadow-md"
                      : "border-transparent hover:border-line hover:shadow-sm",
                  ].join(" ")}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={isSelected}
                >
                  {image.type === "original" ? (
                    <Image
                      src={image.thumbnail}
                      alt={`${productTitle} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="72px"
                      quality={70}
                    />
                  ) : (
                    <Image
                      src={image.thumbnail}
                      alt={`${productTitle} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="72px"
                      quality={70}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* "More product photos" expandable panel */}
        {apiPhotos.length > 0 && (
          <div className="mt-1">
            {!panelExpanded ? (
              <button
                onClick={togglePanel}
                className="flex items-center gap-2 text-sm font-medium text-dark-blue border border-line rounded px-3 py-2 hover:bg-ui-bg-subtle transition-colors duration-150"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>More product photos</span>
              </button>
            ) : (
              <div className="border border-line p-4 flex flex-col gap-4">
                {/* Panel header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-dark-blue">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>More product photos</span>
                  </div>
                  <button
                    onClick={togglePanel}
                    className="text-ui-fg-muted hover:text-dark-blue transition-colors duration-150 rounded p-0.5"
                    aria-label="Close photo panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isLoadingPhotos ? (
                  <p className="text-sm text-ui-fg-muted">Loading photos...</p>
                ) : (
                  <>
                    {/* Category chips */}
                    {allCategories.length > 1 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-ui-fg-muted uppercase tracking-wide">
                          Category
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map((category) => {
                            const isActive = selectedCategory === category
                            return (
                              <button
                                key={category}
                                onClick={() => handleCategorySelect(category)}
                                className={[
                                  "px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150",
                                  isActive
                                    ? "bg-dark-blue text-white"
                                    : "border border-line text-dark-blue hover:bg-ui-bg-subtle",
                                ].join(" ")}
                              >
                                {formatCategoryName(category)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Combination chips — only for PRODUCT_PHOTOS */}
                    {selectedCategory === PRODUCT_PHOTOS_CATEGORY &&
                      availableCombinations.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-medium text-ui-fg-muted uppercase tracking-wide">
                            Configurations
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {availableCombinations.map((combination) => {
                              const isActive =
                                selectedCombination === combination
                              return (
                                <button
                                  key={combination}
                                  onClick={() =>
                                    handleCombinationSelect(combination)
                                  }
                                  className={[
                                    "px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150",
                                    isActive
                                      ? "bg-dark-blue text-white"
                                      : "border border-line text-dark-blue hover:bg-ui-bg-subtle",
                                  ].join(" ")}
                                >
                                  {combination}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    {/* Fabric chips */}
                    {selectedCategory === PRODUCT_PHOTOS_CATEGORY &&
                      selectedCombination &&
                      availableFabrics.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-medium text-ui-fg-muted uppercase tracking-wide">
                            Fabrics
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {availableFabrics.map((fabric) => {
                              const isActive = selectedFabric === fabric
                              return (
                                <button
                                  key={fabric}
                                  onClick={() => handleFabricSelect(fabric)}
                                  className={[
                                    "px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150",
                                    isActive
                                      ? "bg-dark-blue text-white"
                                      : "border border-line text-dark-blue hover:bg-ui-bg-subtle",
                                  ].join(" ")}
                                >
                                  {fabric}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    {/* Filtered thumbnail grid */}
                    {filteredApiImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {filteredApiImages.map((image, index) => {
                          const isSelected =
                            panelExpanded && index === selectedIndex
                          return (
                            <button
                              key={image.id}
                              onClick={() => setSelectedIndex(index)}
                              className={[
                                "relative flex-shrink-0 w-[72px] h-[72px] overflow-hidden border-2 rounded-sm transition-all duration-150 bg-white",
                                isSelected
                                  ? "border-dark-blue shadow-md"
                                  : "border-transparent hover:border-line hover:shadow-sm",
                              ].join(" ")}
                              aria-label={`View photo ${index + 1}`}
                              aria-pressed={isSelected}
                            >
                              <Image
                                src={image.thumbnail}
                                alt={`${productTitle} photo ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="72px"
                                quality={70}
                              />
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      selectedCategory && (
                        <p className="text-sm text-ui-fg-muted">
                          No photos available for the selected filters.
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox — only for original DB images */}
      {lightboxImages.length > 0 && (
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
                  src={(lightboxImages[lightboxIndex] ?? lightboxImages[0]).src}
                  alt={`${productTitle} - image ${lightboxIndex + 1} of ${
                    lightboxImages.length
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
              {lightboxImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setLightboxIndex((i) =>
                        navigate("prev", lightboxImages.length, i)
                      )
                    }
                    className="fixed left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-7 h-7 text-white" />
                  </button>
                  <button
                    onClick={() =>
                      setLightboxIndex((i) =>
                        navigate("next", lightboxImages.length, i)
                      )
                    }
                    className="fixed right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-7 h-7 text-white" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </>
  )
}

export default ProductImageGallery
