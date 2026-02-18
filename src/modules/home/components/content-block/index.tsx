"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ContentBlockProps,
  ContentBlockImage,
  ContentBlockStyle,
  ContentBlockLinkedItem,
  CategoryTileItem,
} from "./types"
import VideoPlayer from "./video-player"
import ArrowLeft from "@modules/common/icons/arrow-left"
import ArrowRight from "@modules/common/icons/arrow-right"

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

function parseExtraCss(raw: unknown): React.CSSProperties {
  if (!raw) return {}
  // If already an object, return it directly
  if (typeof raw === "object" && raw !== null) {
    return raw as React.CSSProperties
  }
  // If it's a string, parse it
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as React.CSSProperties
    } catch {
      return {}
    }
  }
  return {}
}

export default function ContentBlock({
  data,
  index,
  languageCode,
}: ContentBlockProps) {
  const profile = getProfile(data.content_block_profiles, languageCode)
  const extraCss = parseExtraCss(data.extra_css)

  const hasMaxHeight = data.max_height != null || extraCss.maxHeight != null

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
    ...(hasMaxHeight && { overflow: "hidden" }),
  }

  const alignImage = index % 2 === 1 ? "right" : "left"

  return (
    <section style={sectionStyle}>
      {data.type === "text_and_image" && (
        <TextAndImage
          style={data.style}
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
          containerMaxHeight={data.max_height ?? extraCss.maxHeight}
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

      {data.type === "button" && (
        <ButtonBlock
          style={data.style}
          buttonText={profile?.name ?? null}
          link={profile?.link ?? null}
          linkNewTab={data.link_new_tab}
          page={data.link_page}
          languageCode={languageCode}
          backgroundColor={data.background_color}
          textColor={data.text_color}
        />
      )}

      {data.type === "photo_links" && (
        <PhotoLinks
          items={data.linked_items ?? []}
          languageCode={languageCode}
        />
      )}

      {data.type === "category_tiles" && (
        <CategoryTiles
          tiles={data.category_tile_items ?? []}
          languageCode={languageCode}
        />
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
            {name.split("\\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < name.split("\\n").length - 1 && <br />}
              </span>
            ))}
          </h3>
        )}
        {description &&
          description.split("\\n").map((line, i) => (
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
  style,
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
  containerMaxHeight,
}: {
  style: string | null
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
  containerMaxHeight?: number | string | null
}) {
  // Text on image (overlay) style
  if (style === "text_on_image") {
    return (
      <div
        className="relative mx-auto w-full overflow-hidden"
        style={{
          ...(backgroundColor && { backgroundColor }),
          ...(containerMaxHeight && { height: containerMaxHeight }),
        }}
      >
        {/* Background image */}
        {sectionImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sectionImage}
            alt={sectionName ?? ""}
            className="h-full w-full object-cover"
            style={{
              ...mediaStyle({
                mediaMaxHeight,
                mediaMaxWidth,
                mediaMinHeight,
                mediaMinWidth,
              }),
              ...(!containerMaxHeight && { minHeight: mediaMinHeight ?? 400 }),
            }}
          />
        )}

        {/* Overlay text - centered */}
        <div className="absolute inset-0 flex items-center justify-center px-6 py-10">
          <div className="max-w-2xl text-center">
            {sectionName && (
              <h3
                className="mb-4 text-xl font-medium small:text-2xl"
                style={textColor ? { color: textColor } : undefined}
              >
                {sectionName.split("\\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < sectionName.split("\\n").length - 1 && <br />}
                  </span>
                ))}
              </h3>
            )}
            {sectionDescription &&
              sectionDescription.split("\\n").map((line, i) => (
                <p
                  key={i}
                  className="text-base font-normal leading-6"
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

  // Default: side_by_side style (text left, image right)
  return (
    <div
      className="mx-auto flex max-w-screen-xl flex-col small:flex-row"
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
            {sectionName.split("\\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < sectionName.split("\\n").length - 1 && <br />}
              </span>
            ))}
          </h3>
        )}
        {sectionDescription &&
          sectionDescription.split("\\n").map((line, i) => (
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
  const lines = sectionDescription ? sectionDescription.split("\\n") : []
  const midpoint = Math.ceil(lines.length / 2)
  const leftLines = lines.slice(0, midpoint)
  const rightLines = lines.slice(midpoint)

  return (
    <div
      className="content-container py-10 small:py-16 large:px-0 px-6"
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
              {sectionName.split("\\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < sectionName.split("\\n").length - 1 && <br />}
                </span>
              ))}
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
  const lines = sectionDescription ? sectionDescription.split("\\n") : []
  const midpoint = Math.ceil(lines.length / 2)
  const leftLines = lines.slice(0, midpoint)
  const rightLines = lines.slice(midpoint)

  return (
    <div
      className="content-container py-10 small:py-16 large:px-0 px-6"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {/* Centered title */}
      {sectionName && (
        <h3
          className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] small:mb-12 small:text-sm"
          style={textColor ? { color: textColor } : undefined}
        >
          {sectionName.split("\\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < sectionName.split("\\n").length - 1 && <br />}
            </span>
          ))}
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

/* ─── Button Block ────────────────────────────────────────── */

function ButtonBlock({
  style,
  buttonText,
  link,
  linkNewTab,
  page,
  languageCode,
  backgroundColor,
  textColor,
}: {
  style: string | null
  buttonText: string | null
  link: string | null
  linkNewTab: boolean | null
  page: {
    id: string
    page_profiles: { slug: string; language: string }[]
  } | null
  languageCode: string
  backgroundColor: string | null
  textColor: string | null
}) {
  // Resolve href
  let href: string | null = null
  let target: string | undefined = undefined

  if (page) {
    const pageProfile = page.page_profiles.find(
      (pp) => pp.language.toLowerCase() === languageCode.toLowerCase()
    )
    if (pageProfile) {
      href = `/${languageCode}/${pageProfile.slug}`
    }
  } else if (link) {
    href = link
    if (linkNewTab) {
      target = "_blank"
    }
  }

  const isFilled = style === "filled"
  const text = buttonText || "Read more"

  const buttonStyle: React.CSSProperties = isFilled
    ? {
        backgroundColor: backgroundColor || "#1a1a1a",
        color: textColor || "#ffffff",
      }
    : {
        color: textColor || "currentColor",
        borderColor: textColor || "currentColor",
      }

  const buttonClasses = `inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm tracking-wide transition-opacity hover:opacity-80 ${
    isFilled ? "" : "border"
  }`

  const arrow = <ArrowRight size="16" color="currentColor" />

  if (!href) {
    return (
      <div className="flex justify-center py-8">
        <span className={buttonClasses} style={buttonStyle}>
          {text}
          {arrow}
        </span>
      </div>
    )
  }

  return (
    <div className="flex justify-center py-8">
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={buttonClasses}
        style={buttonStyle}
      >
        {text}
        {arrow}
      </a>
    </div>
  )
}

/* ─── Photo Links ─────────────────────────────────────────── */

function PhotoLinks({
  items,
  languageCode,
}: {
  items: ContentBlockLinkedItem[]
  languageCode: string
}) {
  if (items.length === 0) return null

  const sorted = [...items].sort((a, b) => a.arrangement - b.arrangement)
  const count = sorted.length

  return (
    <div className="content-container">
      <div
        className={`grid gap-3 small:gap-4 ${
          count === 1
            ? "grid-cols-1"
            : count === 2
            ? "grid-cols-2"
            : count === 3
            ? "grid-cols-2 small:grid-cols-3"
            : count === 4
            ? "grid-cols-2 small:grid-cols-4"
            : count === 5
            ? "grid-cols-2 small:grid-cols-5"
            : "grid-cols-2 small:grid-cols-6"
        }`}
      >
        {sorted.map((item) => (
          <a
            key={item.id}
            href={item.link}
            className="group relative block overflow-hidden"
          >
            <div className="aspect-[3/4] w-full">
              {item.image?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image.src}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-200" />
              )}
            </div>
            <div className="py-3">
              <h4 className="text-sm font-medium uppercase tracking-wider text-dark-blue">
                {item.title}
              </h4>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* ─── Category Tiles ──────────────────────────────────────── */

function CategoryTiles({
  tiles,
  languageCode,
}: {
  tiles: CategoryTileItem[]
  languageCode: string
}) {
  if (!tiles.length) return null

  return (
    <div className="content-container">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, 1fr)`,
        }}
      >
        {tiles.map((category) => {
          const profile =
            category.category_profiles.find(
              (p) => p.language.toLowerCase() === languageCode.toLowerCase()
            ) ?? category.category_profiles[0]

          const permalink = profile?.meta_information?.permalink
          const href = permalink
            ? `/${languageCode}/categories/${permalink}`
            : "#"

          const imageSrc = category.banners?.[0]?.src || category.image?.src

          return (
            <a
              key={category.id}
              href={href}
              className="group relative block overflow-hidden"
            >
              <div className="h-[600px] w-full">
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={profile?.name ?? ""}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200" />
                )}
              </div>
              {/* Dark gradient overlay at bottom */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[428px] bg-gradient-to-t from-black/60 to-transparent" />
              {/* Category name */}
              <span className="absolute bottom-4 left-6 text-sm font-light uppercase tracking-[0.2em] text-white">
                {profile?.name}
              </span>
            </a>
          )
        })}
      </div>
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
      {/* Navigation arrows — above photos, hidden on mobile */}
      {totalPages > 1 && (
        <div
          className={`mb-4 flex items-center justify-end gap-4 ${
            isMasonry ? "" : "content-container hidden small:flex"
          }`}
        >
          <button
            onClick={goToPrevious}
            className="transition-opacity hover:opacity-70"
            aria-label="Previous images"
          >
            <ArrowLeft size="20" color="dark-blue-70" />
          </button>
          <button
            onClick={goToNext}
            className="transition-opacity hover:opacity-70"
            aria-label="Next images"
          >
            <ArrowRight size="20" color="dark-blue" />
          </button>
        </div>
      )}

      {isMasonry ? (
        <GalleryMasonry pageImages={pages[currentPage] ?? []} />
      ) : (
        <GallerySpreadHarmony
          pageImages={pages[currentPage] ?? []}
          orientations={orientations}
          allImages={images}
        />
      )}

      {/* Desktop progress indicator */}
      {totalPages > 1 && !isMasonry && (
        <div className="px-8 mt-6 hidden content-container small:block">
          <div className="h-0.5 w-full bg-gray-200">
            <div
              className="h-full bg-gray-900 transition-all duration-300"
              style={{
                width: `${(1 / totalPages) * 100}%`,
                marginLeft: `${
                  (currentPage / (totalPages - 1)) *
                  (100 - (1 / totalPages) * 100)
                }%`,
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

function GalleryImage({
  image,
  className,
}: {
  image: ContentBlockImage
  className?: string
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.src} alt="" className={className} />
}

function GallerySpreadHarmony({
  pageImages,
  orientations,
  allImages,
}: {
  pageImages: ContentBlockImage[]
  orientations: Record<string, Orientation>
  allImages: ContentBlockImage[]
}) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    const maxScroll = scrollWidth - clientWidth
    setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0)
  }, [])

  const indicatorWidth = allImages.length > 0 ? (1 / allImages.length) * 100 : 0
  const indicatorPosition = scrollProgress * (100 - indicatorWidth)

  return (
    <>
      {/* Mobile: horizontal scroll gallery */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory items-center gap-4 overflow-x-auto small:hidden"
      >
        {allImages.map((img) => (
            <div
              key={img.id}
              className="flex-shrink-0 snap-center overflow-hidden"
              style={{
                width: "80vw",
                height: "min(80vw, 400px)",
              }}
            >
              <GalleryImage
                image={img}
                className="h-full w-full object-cover"
              />
            </div>
        ))}
      </div>

      {/* Scroll progress indicator - mobile only */}
      {allImages.length > 1 && (
        <div className="mt-4 flex justify-center small:hidden">
          <div className="h-0.5 bg-gray-200" style={{ width: "80vw" }}>
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

      {/* Desktop */}
      <div
        className="hidden small:block"
        style={{ height: "clamp(400px, 60vw, 800px)" }}
      >
        <div className="content-container flex h-full gap-4">
          {pageImages.length === 2 ? (
            <>
              {/* 2-photo layout: horizontal first = 2/3 + 1/3, vertical first = 1/2 + 1/2 */}
              {pageImages[0] && (
                <div
                  className={`h-full shrink-0 overflow-hidden ${
                    orientations[pageImages[0].id] === "horizontal"
                      ? "w-2/3"
                      : "w-1/2"
                  }`}
                >
                  <GalleryImage
                    image={pageImages[0]}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {pageImages[1] && (
                <div
                  className={`flex h-full flex-col gap-4 ${
                    orientations[pageImages[0]?.id] === "horizontal"
                      ? "w-1/3"
                      : "w-1/2"
                  }`}
                >
                  <div className="h-1/2 overflow-hidden">
                    <GalleryImage
                      image={pageImages[1]}
                      className="h-full w-full object-contain object-left"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* 3-photo layout: large left + 2 stacked right */}
              {pageImages[0] && (
                <div
                  className={`h-full overflow-hidden ${
                    orientations[pageImages[0].id] === "vertical"
                      ? "w-1/2"
                      : "w-2/3"
                  }`}
                >
                  <GalleryImage
                    image={pageImages[0]}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div
                className={`flex h-full flex-col gap-4 ${
                  orientations[pageImages[0]?.id] === "vertical"
                    ? "w-1/2"
                    : "w-1/3"
                }`}
              >
                {pageImages.slice(1, 3).map((img, i) => (
                  <div key={img.id ?? i} className="h-1/2 overflow-hidden">
                    <GalleryImage
                      image={img}
                      className={`h-full w-full object-contain ${
                        i === 0 ? "object-left" : "object-right"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
