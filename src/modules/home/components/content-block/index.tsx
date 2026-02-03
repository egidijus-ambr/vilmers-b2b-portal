"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ContentBlockProps,
  ContentBlockImage,
  ContentBlockStyle,
} from "./types"
import VideoPlayer from "./video-player"

function getProfile(
  profiles: ContentBlockProps["data"]["content_block_profiles"],
  languageCode: string
) {
  return (
    profiles.find(
      (p) => p.language.toLowerCase() === languageCode.toLowerCase()
    ) ??
    profiles[0] ??
    null
  )
}

function parseExtraCss(raw: string | null): React.CSSProperties {
  try {
    return JSON.parse(raw ?? "{}") as React.CSSProperties
  } catch {
    return {}
  }
}

export default function ContentBlock({
  data,
  index,
  languageCode,
}: ContentBlockProps) {
  const profile = getProfile(data.content_block_profiles, languageCode)
  const extraCss = parseExtraCss(data.extra_css)

  const sectionStyle: React.CSSProperties = {
    ...(data.default_margins ? { margin: "40px 0" } : { margin: "auto" }),
    ...(data.max_height != null && { maxHeight: data.max_height }),
    ...(data.max_width != null && { maxWidth: data.max_width }),
    ...(data.min_height != null && { minHeight: data.min_height }),
    ...(data.min_width != null && { minWidth: data.min_width }),
    ...(data.top_margin && { marginTop: data.top_margin }),
    ...(data.bottom_margin && { marginBottom: data.bottom_margin }),
    ...(data.left_margin && { marginLeft: data.left_margin }),
    ...(data.right_margin && { marginRight: data.right_margin }),
    ...extraCss,
  }

  const alignImage = index % 2 === 1 ? "right" : "left"

  return (
    <section style={sectionStyle}>
      {data.type === "text_and_image" && (
        <TextAndImage
          alignImage={alignImage}
          sectionImage={data.main_image?.src ?? null}
          sectionName={profile?.name ?? null}
          sectionDescription={profile?.description ?? null}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          mediaMaxHeight={data.media_max_height}
          mediaMaxWidth={data.media_max_width}
          mediaMinHeight={data.media_min_height}
          mediaMinWidth={data.media_min_width}
          objectFitCover={data.object_fit_cover}
        />
      )}

      {data.type === "text_and_video" && (
        <TextAndVideo
          alignImage={alignImage}
          sectionName={profile?.name ?? null}
          sectionDescription={profile?.description ?? null}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          mediaMaxHeight={data.media_max_height}
          mediaMaxWidth={data.media_max_width}
          mediaMinHeight={data.media_min_height}
          mediaMinWidth={data.media_min_width}
          objectFitCover={data.object_fit_cover}
          videoType={data.video_type}
          videoLink={data.video_link}
          videoAutoplay={data.video_autoplay}
          videoLoop={data.video_loop}
        />
      )}

      {data.type === "only_text" && (
        <OnlyText
          style={data.style}
          sectionName={profile?.name ?? null}
          sectionDescription={profile?.description ?? null}
          backgroundColor={data.background_color}
          textColor={data.text_color}
        />
      )}

      {data.type === "only_image" && (
        <OnlyImage sectionImage={data.main_image?.src ?? null} />
      )}

      {data.type === "only_video" && (
        <OnlyVideo
          videoType={data.video_type}
          videoLink={data.video_link}
          videoAutoplay={data.video_autoplay}
          videoLoop={data.video_loop}
          objectFitCover={data.object_fit_cover}
        />
      )}

      {data.type === "gallery" && (
        <Gallery images={data.gallery_images ?? []} style={data.style} />
      )}
    </section>
  )
}

/* ─── Text Section Helper ─────────────────────────────────── */

function TextSection({
  name,
  description,
  textColor,
}: {
  name: string | null
  description: string | null
  textColor: string | null
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-10 small:px-12 small:py-16">
      <div className="mx-auto max-w-lg">
        {name && (
          <h3
            className="mb-4 text-xl font-medium small:text-2xl"
            style={textColor ? { color: textColor } : undefined}
          >
            {name}
          </h3>
        )}
        {description &&
          description.split("\n").map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
      </div>
    </div>
  )
}

/* ─── Media Size Style Helper ─────────────────────────────── */

function mediaStyle(opts: {
  mediaMaxHeight: number | null
  mediaMaxWidth: number | null
  mediaMinHeight: number | null
  mediaMinWidth: number | null
}): React.CSSProperties {
  return {
    ...(opts.mediaMaxHeight != null && { maxHeight: opts.mediaMaxHeight }),
    ...(opts.mediaMaxWidth != null && { maxWidth: opts.mediaMaxWidth }),
    ...(opts.mediaMinHeight != null && { minHeight: opts.mediaMinHeight }),
    ...(opts.mediaMinWidth != null && { minWidth: opts.mediaMinWidth }),
  }
}

/* ─── Text + Image ────────────────────────────────────────── */

function TextAndImage({
  alignImage,
  sectionImage,
  sectionName,
  sectionDescription,
  backgroundColor,
  textColor,
  mediaMaxHeight,
  mediaMaxWidth,
  mediaMinHeight,
  mediaMinWidth,
  objectFitCover,
}: {
  alignImage: "left" | "right"
  sectionImage: string | null
  sectionName: string | null
  sectionDescription: string | null
  backgroundColor: string | null
  textColor: string | null
  mediaMaxHeight: number | null
  mediaMaxWidth: number | null
  mediaMinHeight: number | null
  mediaMinWidth: number | null
  objectFitCover: boolean | null
}) {
  return (
    <div
      className={`mx-auto flex max-w-screen-xl flex-col small:flex-row ${
        alignImage === "right" ? "small:flex-row-reverse" : ""
      }`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <TextSection
        name={sectionName}
        description={sectionDescription}
        textColor={textColor}
      />

      <div className="flex w-full items-center justify-center small:w-1/2">
        <div
          className="relative w-full overflow-hidden"
          style={mediaStyle({
            mediaMaxHeight,
            mediaMaxWidth,
            mediaMinHeight,
            mediaMinWidth,
          })}
        >
          {sectionImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sectionImage}
              alt={sectionName ?? ""}
              className={
                objectFitCover
                  ? "h-full w-full object-cover"
                  : "max-h-full max-w-full"
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Text + Video ────────────────────────────────────────── */

function TextAndVideo({
  alignImage,
  sectionName,
  sectionDescription,
  backgroundColor,
  textColor,
  mediaMaxHeight,
  mediaMaxWidth,
  mediaMinHeight,
  mediaMinWidth,
  objectFitCover,
  videoType,
  videoLink,
  videoAutoplay,
  videoLoop,
}: {
  alignImage: "left" | "right"
  sectionName: string | null
  sectionDescription: string | null
  backgroundColor: string | null
  textColor: string | null
  mediaMaxHeight: number | null
  mediaMaxWidth: number | null
  mediaMinHeight: number | null
  mediaMinWidth: number | null
  objectFitCover: boolean | null
  videoType: "uploaded" | "youtube" | "vimeo" | null
  videoLink: string | null
  videoAutoplay: boolean | null
  videoLoop: boolean | null
}) {
  return (
    <div
      className={`mx-auto flex max-w-screen-xl flex-col small:flex-row ${
        alignImage === "right" ? "small:flex-row-reverse" : ""
      }`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <TextSection
        name={sectionName}
        description={sectionDescription}
        textColor={textColor}
      />

      <div className="flex w-full items-center justify-center small:w-1/2">
        <div
          className="relative w-full overflow-hidden"
          style={mediaStyle({
            mediaMaxHeight,
            mediaMaxWidth,
            mediaMinHeight,
            mediaMinWidth,
          })}
        >
          <VideoPlayer
            videoType={videoType}
            videoLink={videoLink}
            videoAutoplay={videoAutoplay}
            videoLoop={videoLoop}
            objectFitCover={objectFitCover}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Only Text ───────────────────────────────────────────── */

function OnlyText({
  style,
  sectionName,
  sectionDescription,
  backgroundColor,
  textColor,
}: {
  style: ContentBlockStyle | null
  sectionName: string | null
  sectionDescription: string | null
  backgroundColor: string | null
  textColor: string | null
}) {
  if (style === "3_columns_title_left") {
    return (
      <ThreeColumnsTitleLeft
        sectionName={sectionName}
        sectionDescription={sectionDescription}
        backgroundColor={backgroundColor}
        textColor={textColor}
      />
    )
  }

  if (style === "2_columns_title_top_center") {
    return (
      <TwoColumnsTitleTopCenter
        sectionName={sectionName}
        sectionDescription={sectionDescription}
        backgroundColor={backgroundColor}
        textColor={textColor}
      />
    )
  }

  return (
    <div
      className="mx-auto max-w-screen-xl px-6 py-10 text-center small:px-12 small:py-16"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="mx-auto max-w-2xl">
        {sectionName && (
          <h3
            className="mb-4 text-xl font-medium small:text-2xl"
            style={textColor ? { color: textColor } : undefined}
          >
            {sectionName}
          </h3>
        )}
        {sectionDescription &&
          sectionDescription.split("\n").map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
      </div>
    </div>
  )
}

/* ─── 3 Columns Title Left ────────────────────────────────── */

function ThreeColumnsTitleLeft({
  sectionName,
  sectionDescription,
  backgroundColor,
  textColor,
}: {
  sectionName: string | null
  sectionDescription: string | null
  backgroundColor: string | null
  textColor: string | null
}) {
  // Split description into two roughly equal halves for the two text columns
  const lines = sectionDescription ? sectionDescription.split("\n") : []
  const midpoint = Math.ceil(lines.length / 2)
  const leftLines = lines.slice(0, midpoint)
  const rightLines = lines.slice(midpoint)

  return (
    <div
      className="content-container px-10 py-10 small:py-16"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="grid grid-cols-1 gap-8 small:grid-cols-3 small:gap-12">
        {/* Left column — title */}
        <div className="flex items-start">
          {sectionName && (
            <h3
              className="text-xs font-medium uppercase tracking-[0.2em] small:text-sm"
              style={textColor ? { color: textColor } : undefined}
            >
              {sectionName}
            </h3>
          )}
        </div>

        {/* Middle column — first half of description */}
        <div>
          {leftLines.map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Right column — second half of description */}
        <div>
          {rightLines.map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── 2 Columns Title Top Center ──────────────────────────── */

function TwoColumnsTitleTopCenter({
  sectionName,
  sectionDescription,
  backgroundColor,
  textColor,
}: {
  sectionName: string | null
  sectionDescription: string | null
  backgroundColor: string | null
  textColor: string | null
}) {
  const lines = sectionDescription ? sectionDescription.split("\n") : []
  const midpoint = Math.ceil(lines.length / 2)
  const leftLines = lines.slice(0, midpoint)
  const rightLines = lines.slice(midpoint)

  return (
    <div
      className="content-container px-10 py-10 small:py-16"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {/* Centered title */}
      {sectionName && (
        <h3
          className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] small:mb-12 small:text-sm"
          style={textColor ? { color: textColor } : undefined}
        >
          {sectionName}
        </h3>
      )}

      {/* Two-column description */}
      <div className="grid grid-cols-1 gap-8 small:grid-cols-2 small:gap-12">
        <div>
          {leftLines.map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
        </div>
        <div>
          {rightLines.map((line, i) => (
            <p
              key={i}
              className="text-base font-normal leading-6 text-gray-600"
              style={textColor ? { color: textColor } : undefined}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Only Image ──────────────────────────────────────────── */

function OnlyImage({ sectionImage }: { sectionImage: string | null }) {
  if (!sectionImage) return null

  return (
    <div className="mx-auto max-w-screen-xl text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sectionImage} alt="" className="h-auto max-h-full max-w-full" />
    </div>
  )
}

/* ─── Only Video ──────────────────────────────────────────── */

function OnlyVideo({
  videoType,
  videoLink,
  videoAutoplay,
  videoLoop,
  objectFitCover,
}: {
  videoType: "uploaded" | "youtube" | "vimeo" | null
  videoLink: string | null
  videoAutoplay: boolean | null
  videoLoop: boolean | null
  objectFitCover: boolean | null
}) {
  return (
    <div className="mx-auto max-w-screen-xl text-center">
      <VideoPlayer
        videoType={videoType}
        videoLink={videoLink}
        videoAutoplay={videoAutoplay}
        videoLoop={videoLoop}
        objectFitCover={objectFitCover}
      />
    </div>
  )
}

/* ─── Gallery ─────────────────────────────────────────────── */

type Orientation = "vertical" | "horizontal" | "square"

function useImageOrientations(images: ContentBlockImage[]) {
  const [orientations, setOrientations] = useState<Record<string, Orientation>>(
    {}
  )

  useEffect(() => {
    images.forEach((img) => {
      if (orientations[img.id]) return
      const image = new window.Image()
      image.onload = () => {
        setOrientations((prev) => ({
          ...prev,
          [img.id]:
            image.naturalWidth > image.naturalHeight
              ? "horizontal"
              : image.naturalWidth < image.naturalHeight
              ? "vertical"
              : "square",
        }))
      }
      image.src = img.src
    })
  }, [images, orientations])

  return orientations
}

function Gallery({
  images,
  style,
}: {
  images: ContentBlockImage[]
  style: string | null
}) {
  const [currentPage, setCurrentPage] = useState(0)
  const orientations = useImageOrientations(images)
  const imagesPerPage = 3
  const totalPages = Math.ceil(images.length / imagesPerPage)

  const goToPrevious = useCallback(() => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1))
  }, [totalPages])

  const goToNext = useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0))
  }, [totalPages])

  if (images.length === 0) return null

  // Build array of pages for the carousel
  const pages: ContentBlockImage[][] = []
  for (let i = 0; i < totalPages; i++) {
    const start = i * imagesPerPage
    pages.push(images.slice(start, start + imagesPerPage))
  }

  const isMasonry = style === "masonry"

  return (
    <div
      className={`relative ${
        isMasonry ? "content-container" : "overflow-hidden"
      }`}
    >
      {isMasonry ? (
        <GalleryMasonry pageImages={pages[currentPage] ?? []} />
      ) : (
        <GallerySpreadHarmony
          pages={pages}
          orientations={orientations}
          allImages={images}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}

      {/* Navigation arrows — hidden on mobile for spread harmony (uses swipe instead) */}
      {totalPages > 1 && (
        <div
          className={`items-center gap-3 ${
            isMasonry
              ? "flex absolute left-7 bottom-4"
              : "hidden small:flex content-container mt-4"
          }`}
        >
          <button
            onClick={goToPrevious}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50"
            aria-label="Previous images"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:bg-gray-50"
            aria-label="Next images"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Desktop progress indicator */}
      {totalPages > 1 && !isMasonry && (
        <div className="mt-4 hidden content-container small:block">
          <div className="h-0.5 w-full bg-gray-200">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{
                width: `${(1 / totalPages) * 100}%`,
                marginLeft: `${(currentPage / (totalPages - 1)) * (100 - (1 / totalPages) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Gallery: Masonry ────────────────────────────────────── */

function GalleryMasonry({ pageImages }: { pageImages: ContentBlockImage[] }) {
  return (
    <div
      className="grid grid-cols-2 grid-rows-2 gap-2"
      style={{ height: "80vh", maxHeight: "800px" }}
    >
      {pageImages[0] && (
        <div className="row-span-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pageImages[0].src}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {pageImages[1] && (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pageImages[1].src}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {pageImages[2] && (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pageImages[2].src}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}

/* ─── Gallery: Spread Harmony ─────────────────────────────── */

function GallerySpreadHarmony({
  pages,
  orientations,
  allImages,
  currentPage,
  totalPages,
}: {
  pages: ContentBlockImage[][]
  orientations: Record<string, Orientation>
  allImages: ContentBlockImage[]
  currentPage: number
  totalPages: number
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [groupWidth, setGroupWidth] = useState(0)

  // Measure the width of one image group for precise translateX
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const firstGroup = containerRef.current.querySelector('[data-group="0"]')
        if (firstGroup) {
          setGroupWidth(firstGroup.getBoundingClientRect().width)
        }
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    const maxScroll = scrollWidth - clientWidth
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0
    setScrollProgress(progress)
  }, [])

  const indicatorWidth = allImages.length > 0 ? (1 / allImages.length) * 100 : 0
  const indicatorPosition = scrollProgress * (100 - indicatorWidth)

  // Helper to check if any small image in a group is horizontal
  const hasHorizontalSmallImage = (groupImages: ContentBlockImage[]) =>
    (groupImages[1] && orientations[groupImages[1].id] === "horizontal") ||
    (groupImages[2] && orientations[groupImages[2].id] === "horizontal")

  return (
    <>
      {/* Mobile: horizontal scroll gallery */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-6 small:hidden"
      >
        {allImages.map((img) => {
          const orientation = orientations[img.id]
          const isVertical = orientation === "vertical"
          const isHorizontal = orientation === "horizontal"

          return (
            <div
              key={img.id}
              className="flex-shrink-0 snap-center overflow-hidden"
              style={{
                width: "80vw",
                height: isVertical
                  ? "min(110vw, 500px)"
                  : isHorizontal
                    ? "auto"
                    : "80vw",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                className={
                  isHorizontal ? "h-auto w-full" : "h-full w-full object-cover"
                }
              />
            </div>
          )
        })}
      </div>

      {/* Scroll progress indicator - mobile only */}
      {allImages.length > 1 && (
        <div className="mt-4 px-6 small:hidden">
          <div className="h-0.5 w-full bg-gray-200">
            <div
              className="h-full bg-gray-900 transition-all duration-100"
              style={{
                width: `${indicatorWidth}%`,
                marginLeft: `${indicatorPosition}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Desktop: single continuous strip with translateX navigation */}
      <div
        className="hidden small:block overflow-hidden"
        style={{ height: "clamp(400px, 60vw, 800px)" }}
      >
        <div
          ref={containerRef}
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${currentPage * groupWidth}px)`,
            // Left margin for the first group to align with content-container
            marginLeft: "max(40px, calc((100vw - 1400px) / 2 + 16px))",
          }}
        >
          {/* Render all image groups in a single continuous strip */}
          {pages.map((groupImages, groupIndex) => {
            const anySmallHorizontal = hasHorizontalSmallImage(groupImages)

            return (
              <div
                key={groupIndex}
                data-group={groupIndex}
                className="flex h-full flex-shrink-0 gap-4 pr-4"
                style={{
                  width: "min(1360px, calc(100vw - 24px))",
                }}
              >
                {/* Left — large image */}
                {groupImages[0] && (
                  <div
                    className="h-full flex-shrink-0 overflow-hidden"
                    style={{ width: "min(670px, 48%)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={groupImages[0].src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Right column — two smaller images */}
                <div className="flex h-full flex-1 flex-col gap-4">
                  {groupImages[1] && (
                    <div className="flex flex-1 items-start justify-start overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={groupImages[1].src}
                        alt=""
                        className="h-full object-cover"
                        style={{ maxWidth: anySmallHorizontal ? "100%" : "75%" }}
                      />
                    </div>
                  )}
                  {groupImages[2] && (
                    <div
                      className={`flex flex-1 items-end overflow-hidden ${
                        anySmallHorizontal ? "justify-start" : "justify-end"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={groupImages[2].src}
                        alt=""
                        className="h-full object-cover"
                        style={{ maxWidth: "75%" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
