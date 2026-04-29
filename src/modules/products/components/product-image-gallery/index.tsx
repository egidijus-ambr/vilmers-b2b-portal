"use client"

import Image from "next/image"
import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogPanel,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import {
  ChevronDown,
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
  showCategoryFilter?: boolean
  alwaysExpanded?: boolean
  showPanelHeader?: boolean
}

const PRODUCT_PHOTOS_CATEGORY = "PRODUCT_PHOTOS"

function formatCategoryName(category: string): string {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

type GalleryDropdownProps = {
  label: string
  placeholder: string
  options: string[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  formatOption?: (option: string) => string
}

// Sentinel value Headless UI uses for the unselected state. Keeping the
// Listbox always controlled (vs. switching from undefined → defined) avoids
// React's "uncontrolled to controlled" warning.
const UNSELECTED = ""

const GalleryDropdown = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  formatOption,
}: GalleryDropdownProps) => {
  const display = (option: string) =>
    formatOption ? formatOption(option) : option

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ui-fg-muted uppercase tracking-wide">
        {label}
      </span>
      <Listbox
        value={value ?? UNSELECTED}
        onChange={onChange}
        disabled={disabled}
      >
        <div className="relative">
          <ListboxButton
            className={[
              "flex items-center justify-between gap-x-2 w-full sm:w-72 h-11 border px-4 text-sm transition-colors",
              disabled
                ? "border-line bg-ui-bg-subtle text-ui-fg-muted cursor-not-allowed"
                : "border-gray-300 text-dark-blue hover:border-gray-400 bg-white",
            ].join(" ")}
          >
            <span className={value ? "" : "text-ui-fg-muted"}>
              {value ? display(value) : placeholder}
            </span>
            <ChevronDown className="w-4 h-4" />
          </ListboxButton>
          <ListboxOptions className="absolute left-0 mt-1 z-50 bg-white border border-gray-300 shadow-md min-w-full max-h-72 overflow-auto">
            {options.map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="px-4 py-2.5 text-sm text-dark-blue cursor-pointer hover:bg-gray-100 data-[selected]:font-semibold data-[selected]:bg-ui-bg-subtle"
              >
                {display(option)}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}

const stripImageExtension = (value: string): string =>
  value.replace(/\.(jpe?g|png|webp|avif|gif)$/i, "")

const ProductImageGallery = ({
  images,
  productTitle,
  productName,
  showCategoryFilter = true,
  alwaysExpanded = false,
  showPanelHeader = true,
}: ProductImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [imageLoading, setImageLoading] = useState(true)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(true)

  // API / expanded panel state
  const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(alwaysExpanded)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCombination, setSelectedCombination] = useState<string | null>(
    null
  )
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null)
  const [loadedThumbnails, setLoadedThumbnails] = useState<Set<string>>(new Set())

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

  // Auto-expand panel when alwaysExpanded is set and photos are available
  useEffect(() => {
    if (alwaysExpanded && apiPhotos.length > 0) {
      setPanelExpanded(true)
    }
  }, [alwaysExpanded, apiPhotos])

  // Auto-select default category when API photos load.
  // Combination & fabric remain null — user must pick both before the
  // hero image swaps to API photos.
  useEffect(() => {
    if (!apiPhotos.length) return

    if (!showCategoryFilter) {
      setSelectedCategory(PRODUCT_PHOTOS_CATEGORY)
    } else {
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
    }
    setSelectedCombination(null)
    setSelectedFabric(null)
  }, [apiPhotos, showCategoryFilter])

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
                (p) =>
                  p.category === PRODUCT_PHOTOS_CATEGORY &&
                  p.combination &&
                  // "cover" is a backend artifact (cover-image grouping),
                  // not a user-facing configuration choice. Trim + lowercase
                  // to be robust to backend whitespace/casing variations.
                  p.combination.trim().toLowerCase() !== "cover"
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

  // API photos only drive the hero once BOTH combination and fabric are picked.
  // Until then, the original DB images remain on screen.
  const hasFullSelection =
    panelExpanded &&
    selectedCategory === PRODUCT_PHOTOS_CATEGORY &&
    !!selectedCombination &&
    !!selectedFabric

  const filteredApiImages: DisplayImage[] = hasFullSelection
    ? apiPhotos
        .filter(
          (p) =>
            p.category === selectedCategory &&
            p.combination === selectedCombination &&
            p.fabric === selectedFabric
        )
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

  const displayImages: DisplayImage[] =
    filteredApiImages.length > 0 ? filteredApiImages : originalImages

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
    // Auto-pick the first fabric for the chosen configuration so the hero
    // updates immediately. The user can still change the fabric afterward.
    const firstFabric =
      apiPhotos.find(
        (p) =>
          p.category === PRODUCT_PHOTOS_CATEGORY &&
          p.combination === combination &&
          p.fabric
      )?.fabric ?? null
    setSelectedFabric(firstFabric)
    setSelectedIndex(0)
  }

  const handleFabricSelect = (fabric: string) => {
    setSelectedFabric(fabric)
    setSelectedIndex(0)
  }

  const handleThumbnailLoaded = useCallback((src: string) => {
    setLoadedThumbnails((prev) => new Set(prev).add(src))
  }, [])

  const togglePanel = () => {
    setPanelExpanded((prev) => {
      if (prev) {
        // Collapsing — clear selections so the next expand starts at
        // "no selection" (hero stays on original DB image).
        setSelectedCombination(null)
        setSelectedFabric(null)
        setSelectedIndex(0)
      }
      return !prev
    })
  }

  const lastImageRef = useRef<DisplayImage | null>(null)
  const rawCurrentImage = displayImages[selectedIndex] ?? displayImages[0]
  // Keep showing last image during filter transitions to prevent flash
  if (rawCurrentImage) {
    lastImageRef.current = rawCurrentImage
  }
  const currentImage = rawCurrentImage ?? lastImageRef.current

  // Reset hero spinner whenever the underlying image URL changes. We can't
  // rely on selectedIndex alone because dropdown picks keep the index at 0
  // while the src swaps from a DB image to an API image.
  useEffect(() => {
    if (currentImage) setImageLoading(true)
  }, [currentImage?.src])

  if (!images.length && !apiPhotos.length) {
    return (
      <div className="w-full aspect-square bg-white flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    )
  }

  // The side column shows up to 4 thumbnails alongside the hero. By default
  // these are the cover photos (DB images). Once both selectors are picked
  // and API photos are driving the hero, the same column shows the API
  // (configurator) thumbnails for that combination + fabric pair.
  const sideThumbs =
    filteredApiImages.length > 0
      ? filteredApiImages.slice(0, 4)
      : originalImages.slice(0, 4)
  const showSideColumn = sideThumbs.length > 1

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Hero + cover thumbnail column */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-3">
        {/* Main image */}
        <div
          className="relative w-full lg:flex-1 lg:min-w-0 lg:self-start bg-[#DCDBD8] overflow-hidden cursor-zoom-in group"
          style={{ aspectRatio: "1360 / 840" }}
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

        {/* Side thumbnail column — cover photos by default, API photos
             for the picked configuration + fabric. Vertical column on lg+,
             horizontal row on smaller screens. */}
        {showSideColumn && (
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-1 lg:grid-rows-4 lg:w-1/5 lg:flex-shrink-0 lg:gap-3 lg:self-stretch">
            {sideThumbs.map((image, index) => {
              const isSelected = index === selectedIndex
              return (
                <button
                  key={image.id}
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "relative w-full overflow-hidden border-2 rounded-sm transition-all duration-150 bg-[#DCDBD8]",
                    // Mobile: aspect ratio defines thumb height. Lg: grid-rows-4
                    // on the parent column divides hero height into 4 equal rows,
                    // and h-full makes each thumb fill its row — guaranteeing
                    // the column total height aligns with the hero's bottom.
                    "aspect-[1360/840] lg:aspect-auto lg:h-full",
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
                      className={`object-cover transition-opacity duration-500 ${
                        loadedThumbnails.has(image.thumbnail) ? "opacity-100" : "opacity-0"
                      }`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                      sizes="25vw"
                      quality={70}
                      onLoad={() => handleThumbnailLoaded(image.thumbnail)}
                    />
                  ) : (
                    <Image
                      src={image.thumbnail}
                      alt={`${productTitle} thumbnail ${index + 1}`}
                      fill
                      className={`object-cover transition-opacity duration-500 ${
                        loadedThumbnails.has(image.thumbnail) ? "opacity-100" : "opacity-0"
                      }`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                      sizes="25vw"
                      quality={70}
                      onLoad={() => handleThumbnailLoaded(image.thumbnail)}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}
        </div>

        {/* "More product photos" expandable panel */}
        {apiPhotos.length > 0 && (
          <div className="mt-1">
            {!panelExpanded && !alwaysExpanded ? (
              <button
                onClick={togglePanel}
                className="flex items-center gap-2 text-sm font-medium text-dark-blue border border-line rounded px-3 py-2 hover:bg-ui-bg-subtle transition-colors duration-150"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>More product photos</span>
              </button>
            ) : panelExpanded ? (
              <div className={alwaysExpanded ? "flex flex-col gap-4" : "border border-line p-4 flex flex-col gap-4"}>
                {/* Panel header - only show when not alwaysExpanded and showPanelHeader is true */}
                {!alwaysExpanded && showPanelHeader && (
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
                )}

                {isLoadingPhotos ? (
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
                  >
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="relative w-full aspect-[4/3] rounded-sm bg-gold-10 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Category chips */}
                    {showCategoryFilter && allCategories.length > 1 && (
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

                    {/* Configuration + Fabric dropdowns. Fabric is disabled
                         until a configuration is picked. Thumbnails (below)
                         only render once both are selected. */}
                    {selectedCategory === PRODUCT_PHOTOS_CATEGORY &&
                      availableCombinations.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
                          <GalleryDropdown
                            label="Configurations"
                            placeholder="Select configuration"
                            options={availableCombinations}
                            value={selectedCombination}
                            onChange={handleCombinationSelect}
                          />
                          <GalleryDropdown
                            label="Fabrics"
                            placeholder="Select fabric"
                            options={availableFabrics}
                            value={selectedFabric}
                            onChange={handleFabricSelect}
                            disabled={!selectedCombination}
                            formatOption={stripImageExtension}
                          />
                        </div>
                      )}

                    {/* When both dropdowns are picked but the API has no
                         photo for that exact pair, show an empty-state hint.
                         The thumbnails themselves render in the side column
                         (next to the hero), not inside this panel. */}
                    {hasFullSelection && filteredApiImages.length === 0 && (
                      <p className="text-sm text-ui-fg-muted">
                        No photos available for the selected combination.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : null}
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
          <div
            className="fixed inset-0"
            style={{ backgroundColor: "#F2F0EF" }}
            aria-hidden="true"
          />

          <div className="fixed inset-0 flex items-center justify-center">
            <DialogPanel className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="fixed top-3 right-3 z-10 bg-black/5 hover:bg-black/10 rounded-full p-2 transition-colors"
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6 text-dark-blue" />
              </button>

              {/* Main lightbox image */}
              <div
                className="relative w-full h-full max-w-[1400px] max-h-[85vh]"
                style={{ padding: "2.5rem 1rem 2rem" }}
              >
                {lightboxImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-blue/20 border-t-dark-blue" />
                  </div>
                )}
                <Image
                  src={(lightboxImages[lightboxIndex] ?? lightboxImages[0]).src}
                  alt={`${productTitle} - image ${lightboxIndex + 1} of ${
                    lightboxImages.length
                  }`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1400px) 100vw, 1400px"
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
                    className="fixed left-3 top-1/2 -translate-y-1/2 bg-black/5 hover:bg-black/15 rounded-full p-3 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-7 h-7 text-dark-blue" />
                  </button>
                  <button
                    onClick={() =>
                      setLightboxIndex((i) =>
                        navigate("next", lightboxImages.length, i)
                      )
                    }
                    className="fixed right-3 top-1/2 -translate-y-1/2 bg-black/5 hover:bg-black/15 rounded-full p-3 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-7 h-7 text-dark-blue" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="fixed bottom-3 left-1/2 -translate-x-1/2 text-dark-blue/70 text-sm">
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
