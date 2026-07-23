"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  ContentBlockProps,
  ContentBlockImage,
  ContentBlockStyle,
  ContentBlockLinkedItem,
  CategoryTileItem,
  LinkPageAncestor,
} from "./types"
import type { GridPage } from "./types"
import VideoPlayer from "./video-player"
import ArrowLeft from "@modules/common/icons/arrow-left"
import ArrowRight from "@modules/common/icons/arrow-right"
import B2BProductCard from "@modules/categories/components/category-product-card"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import { SupportedLanguage } from "@lib/i18n"
import ProductCarouselGrid from "@modules/common/components/product-carousel-grid"
import RichText from "@modules/common/components/rich-text"
import CmsCtaButton from "@modules/common/components/cms-cta-button"
import { splitSections } from "./sectionMarker"
import { buildLinkPageHref, type CtaLike } from "./linkResolver"

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

type TitleAlignment = "left" | "center" | "right" | undefined

// Resolve the horizontal text-alignment utility for a block title. When the
// block-level `titleAlignment` config is set it wins; otherwise the style's
// current alignment (`fallback`) is preserved exactly as before.
function titleAlignClass(alignment: TitleAlignment, fallback: string): string {
  if (alignment === "left") return "text-left"
  if (alignment === "center") return "text-center"
  if (alignment === "right") return "text-right"
  return fallback
}

export default function ContentBlock({
  data,
  index,
  languageCode,
  selectedTagSlug = null,
}: ContentBlockProps) {
  const profile = getProfile(data.content_block_profiles, languageCode)
  // `extra_css` may carry a nested `text` object whose styles should apply
  // only to the text column, not the whole section. Split it out here so the
  // section-level spread below never receives it.
  const parsedExtra = parseExtraCss(data.extra_css) as Record<string, unknown>
  const textStyle = (parsedExtra.text ?? undefined) as
    | React.CSSProperties
    | undefined
  const { text: _omitText, ...sectionExtraCss } = parsedExtra
  const extraCss = sectionExtraCss as React.CSSProperties

  // Block-level title settings (from data.config, not per-language).
  const titleAlignment = (data.config as any)?.titleAlignment as TitleAlignment
  const hideTitle = Boolean((data.config as any)?.hideTitle)
  // Block-level display width setting (mirrors page hero's `hero_display`).
  const display =
    ((data.config as any)?.display as
      | "full_width"
      | "content_width"
      | "text_width"
      | undefined) ?? "full_width"
  // Width class derived from `display`, used by the video blocks (only_video
  // & text_and_video): content_width => site content container; text_width
  // => the same 900px column width as text blocks (max-w-[900px] at :697);
  // full_width => unconstrained (no class).
  const displayWidthClass =
    display === "content_width"
      ? "content-container"
      : display === "text_width"
      ? "max-w-[900px]"
      : ""
  // Block-level "show controls" setting for uploaded videos (only_video &
  // text_and_video). Lives in the free-form config JSON, not a typed field.
  // Default ON so existing uploaded videos with no stored value get controls.
  const videoControls =
    ((data.config as any)?.video_controls as boolean | undefined) ?? true
  // Image/text width ratio for `side_by_side` & `image_left` (image:text).
  // Coerce unknown/missing values to the neutral 50/50 so the literal-class
  // lookup below always resolves to a real Tailwind class.
  const mediaRatioRaw = (data.config as any)?.mediaRatio
  const mediaRatio: MediaRatio =
    mediaRatioRaw === "60_40" || mediaRatioRaw === "40_60"
      ? mediaRatioRaw
      : "50_50"

  // Gallery blocks use `maxHeight` as the gallery's own "stage height" (see
  // `galleryStageHeight` below) rather than as a clip on the outer <section>
  // — a section-level max-height + overflow:hidden would just crop the
  // gallery's image slots instead of resizing them. Every other block type
  // keeps the exact prior behavior.
  const isGalleryBlock = data.type === "gallery"

  // Coalesce both maxHeight sources (dedicated column + Custom Styles JSON —
  // same precedence precedent as `containerMaxHeight` below) and coerce to a
  // plain number of px for the gallery's stage-height math.
  const rawGalleryMaxHeight =
    data.max_height ?? (extraCss.maxHeight as number | string | undefined)
  const galleryStageHeight =
    rawGalleryMaxHeight == null
      ? undefined
      : typeof rawGalleryMaxHeight === "number"
      ? rawGalleryMaxHeight
      : parseFloat(rawGalleryMaxHeight) || undefined

  const hasMaxHeight =
    !isGalleryBlock && (data.max_height != null || extraCss.maxHeight != null)

  // Strip `maxHeight` out of the extraCss spread for gallery blocks only, so
  // Custom Styles' maxHeight never reaches the <section>'s inline style.
  const gallerySectionExtraCss = isGalleryBlock
    ? (() => {
        const { maxHeight, ...rest } = extraCss
        return rest
      })()
    : extraCss

  const sectionStyle: React.CSSProperties = {
    ...(data.default_margins ? { marginBottom: "20px" } : { margin: "auto" }),
    ...(data.max_height != null &&
      !isGalleryBlock && { maxHeight: data.max_height }),
    ...(data.max_width != null && { maxWidth: data.max_width }),
    ...(data.min_height != null && { minHeight: data.min_height }),
    ...(data.min_width != null && { minWidth: data.min_width }),
    ...(data.top_margin && { marginTop: data.top_margin }),
    ...(data.bottom_margin && { marginBottom: data.bottom_margin }),
    ...(data.left_margin && { marginLeft: data.left_margin }),
    ...(data.right_margin && { marginRight: data.right_margin }),
    ...gallerySectionExtraCss,
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
          descriptionFormat={profile?.description_format ?? null}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          textStyle={textStyle}
          mediaMaxHeight={data.media_max_height}
          mediaMaxWidth={data.media_max_width}
          mediaMinHeight={data.media_min_height}
          mediaMinWidth={data.media_min_width}
          objectFitCover={data.object_fit_cover}
          containerMaxHeight={data.max_height ?? extraCss.maxHeight}
          titleAlignment={titleAlignment}
          hideTitle={hideTitle}
          display={display}
          mediaRatio={mediaRatio}
          ctaLabel={profile?.cta_label ?? null}
          ctaLink={profile?.cta_link ?? null}
          ctaLinkPage={data.cta_link_page}
          ctaLinkType={data.cta_link_type}
          ctaLinkCategory={data.cta_link_category}
          ctaNewTab={data.cta_new_tab}
          languageCode={languageCode}
        />
      )}

      {data.type === "text_and_video" && (
        <TextAndVideo
          alignImage={alignImage}
          sectionName={profile?.name ?? null}
          sectionDescription={profile?.description ?? null}
          descriptionFormat={profile?.description_format ?? null}
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
          videoControls={videoControls}
          titleAlignment={titleAlignment}
          hideTitle={hideTitle}
          displayWidthClass={displayWidthClass}
        />
      )}

      {data.type === "only_text" && (
        <OnlyText
          style={data.style}
          sectionDescription={profile?.description ?? null}
          descriptionFormat={profile?.description_format ?? null}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          titleAlignment={titleAlignment}
          textStyle={textStyle}
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
          videoControls={videoControls}
          objectFitCover={data.object_fit_cover}
          displayWidthClass={displayWidthClass}
        />
      )}

      {data.type === "gallery" && (
        <Gallery
          images={data.gallery_images ?? []}
          style={data.style}
          display={
            ((data.config as any)?.display as GalleryDisplay | undefined) ??
            "content_width"
          }
          stageHeight={galleryStageHeight}
        />
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
          tiles={data.categories ?? []}
          languageCode={languageCode}
        />
      )}

      {data.type === "product_grid" && (
        <ProductGrid
          products={data.products ?? []}
          title={profile?.name ?? null}
          description={profile?.description ?? null}
          descriptionFormat={profile?.description_format ?? null}
          languageCode={languageCode}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          titleAlignment={titleAlignment}
          hideTitle={hideTitle}
        />
      )}

      {data.type === "page_grid" && (
        <PageGrid
          pages={data.grid_pages ?? []}
          tags={data.grid_tags ?? []}
          title={profile?.name ?? null}
          description={profile?.description ?? null}
          descriptionFormat={profile?.description_format ?? null}
          languageCode={languageCode}
          backgroundColor={data.background_color}
          textColor={data.text_color}
          showTags={Boolean((data.config as any)?.show_tags)}
          selectedTagSlug={selectedTagSlug}
          titleAlignment={titleAlignment}
          hideTitle={hideTitle}
        />
      )}
    </section>
  )
}

/* ─── Text Section Helper ─────────────────────────────────── */

function TextSection({
  name,
  description,
  descriptionFormat,
  textColor,
  widthClass = "flex-1",
  verticalJustifyClass = "justify-center",
  paddingClass = "px-6 py-10 small:px-12 small:py-16",
  titleAlignment,
  hideTitle = false,
  style,
  ctaLabel,
  ctaLink,
  ctaLinkPage,
  ctaLinkType,
  ctaLinkCategory,
  ctaNewTab,
  languageCode,
}: {
  name: string | null
  description: string | null
  descriptionFormat?: "plain" | "markdown" | null
  textColor: string | null
  widthClass?: string
  verticalJustifyClass?: string
  paddingClass?: string
  titleAlignment?: TitleAlignment
  hideTitle?: boolean
  style?: React.CSSProperties
  ctaLabel?: string | null
  ctaLink?: string | null
  ctaLinkPage?: LinkPage | null
  ctaLinkType?: CtaLike["cta_link_type"]
  ctaLinkCategory?: CtaLike["cta_link_category"]
  ctaNewTab?: boolean | null
  languageCode?: string
}) {
  return (
    <div
      className={`flex flex-col ${paddingClass} ${widthClass} ${verticalJustifyClass}`}
      style={style}
    >
      <div>
        {!hideTitle && name && (
          <h3
            className={`mb-4 eyebrow ${titleAlignClass(
              titleAlignment,
              "text-left"
            )}`}
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
        <RichText
          value={description}
          format={descriptionFormat}
          textColor={textColor}
        />
      </div>
      {/* Sibling of the text content (not nested inside it) so `mt-auto`
          can push it to the bottom of this full-height column, level with
          the bottom of the adjacent image column. Self-hides (renders
          null) when there's no CTA, so the no-CTA case (e.g. TextAndVideo)
          is unaffected — `verticalJustifyClass` still centers/positions the
          lone text-content div exactly as before. */}
      <CmsCtaButton
        label={ctaLabel ?? null}
        link={ctaLink ?? null}
        linkPage={ctaLinkPage ?? null}
        linkType={ctaLinkType}
        linkCategory={ctaLinkCategory}
        newTab={ctaNewTab ?? null}
        languageCode={languageCode ?? "en"}
        showArrow
        className="mt-auto self-start"
      />
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

// Image/text width ratio for the `side_by_side` & `image_left` styles.
// Semantics are image:text — `60_40` = image 60% / text 40%. Classes are FULL
// LITERALS (no interpolation) so Tailwind's JIT source scan keeps them, and
// only the `small:`-prefixed width changes so mobile stacking is untouched.
type MediaRatio = "50_50" | "60_40" | "40_60"

const MEDIA_IMG_W: Record<MediaRatio, string> = {
  "50_50": "small:w-1/2",
  "60_40": "small:w-3/5",
  "40_60": "small:w-2/5",
}
const MEDIA_TEXT_W: Record<MediaRatio, string> = {
  "50_50": "small:w-1/2",
  "60_40": "small:w-2/5",
  "40_60": "small:w-3/5",
}

function TextAndImage({
  style,
  sectionImage,
  sectionName,
  sectionDescription,
  descriptionFormat,
  backgroundColor,
  textColor,
  mediaMaxHeight,
  mediaMaxWidth,
  mediaMinHeight,
  mediaMinWidth,
  objectFitCover,
  containerMaxHeight,
  titleAlignment,
  hideTitle,
  display = "full_width",
  mediaRatio = "50_50",
  ctaLabel,
  ctaLink,
  ctaLinkPage,
  ctaLinkType,
  ctaLinkCategory,
  ctaNewTab,
  languageCode,
  textStyle,
}: {
  style: string | null
  sectionImage: string | null
  sectionName: string | null
  sectionDescription: string | null
  descriptionFormat?: "plain" | "markdown" | null
  backgroundColor: string | null
  textColor: string | null
  mediaMaxHeight: number | null
  mediaMaxWidth: number | null
  mediaMinHeight: number | null
  mediaMinWidth: number | null
  objectFitCover: boolean | null
  containerMaxHeight?: number | string | null
  titleAlignment: TitleAlignment
  hideTitle: boolean
  display?: "full_width" | "content_width" | "text_width"
  mediaRatio?: MediaRatio
  ctaLabel?: string | null
  ctaLink?: string | null
  ctaLinkPage?: LinkPage | null
  ctaLinkType?: CtaLike["cta_link_type"]
  ctaLinkCategory?: CtaLike["cta_link_category"]
  ctaNewTab?: boolean | null
  languageCode?: string
  textStyle?: React.CSSProperties
}) {
  // Text on image (overlay) style
  if (style === "text_on_image") {
    const isContentWidth = display === "content_width"
    const isTextWidth = display === "text_width"

    const textOnImageBlock = (
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
          <div className="max-w-2xl text-center" style={textStyle}>
            <RichText
              value={sectionDescription}
              format={descriptionFormat}
              textColor={textColor}
              paragraphClassName="text-base font-normal leading-6"
            />
            <CmsCtaButton
              label={ctaLabel ?? null}
              link={ctaLink ?? null}
              linkPage={ctaLinkPage ?? null}
              linkType={ctaLinkType}
              linkCategory={ctaLinkCategory}
              newTab={ctaNewTab ?? null}
              languageCode={languageCode ?? "en"}
              onImage
              className="mt-3"
            />
          </div>
        </div>
      </div>
    )

    if (isContentWidth) {
      return <div className="content-container">{textOnImageBlock}</div>
    }

    if (isTextWidth) {
      return (
        <div className="max-w-[900px] w-full mx-auto">{textOnImageBlock}</div>
      )
    }

    return textOnImageBlock
  }

  if (style === "image_left") {
    return (
      <div
        className="content-container large:px-0 px-6"
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <div className="flex flex-col-reverse small:flex-row-reverse">
          <TextSection
            name={null}
            description={sectionDescription}
            descriptionFormat={descriptionFormat}
            textColor={textColor}
            widthClass={`w-full ${MEDIA_TEXT_W[mediaRatio]}`}
            verticalJustifyClass="justify-start"
            paddingClass="pt-6 small:pt-0 small:pl-12"
            style={textStyle}
            ctaLabel={ctaLabel}
            ctaLink={ctaLink}
            ctaLinkPage={ctaLinkPage}
            ctaLinkType={ctaLinkType}
            ctaLinkCategory={ctaLinkCategory}
            ctaNewTab={ctaNewTab}
            languageCode={languageCode}
          />

          <div
            className={`flex w-full items-stretch justify-center ${MEDIA_IMG_W[mediaRatio]} small:self-stretch`}
          >
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
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default: side_by_side style (text left, image right)
  return (
    <div
      className="content-container large:px-0 px-6"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="flex flex-col small:flex-row">
        <TextSection
          name={null}
          description={sectionDescription}
          descriptionFormat={descriptionFormat}
          textColor={textColor}
          widthClass={`w-full ${MEDIA_TEXT_W[mediaRatio]}`}
          verticalJustifyClass="justify-start"
          paddingClass="pb-6 small:pb-0 small:pr-12"
          style={textStyle}
          ctaLabel={ctaLabel}
          ctaLink={ctaLink}
          ctaLinkPage={ctaLinkPage}
          ctaLinkType={ctaLinkType}
          ctaLinkCategory={ctaLinkCategory}
          ctaNewTab={ctaNewTab}
          languageCode={languageCode}
        />

        <div
          className={`flex w-full items-stretch justify-center ${MEDIA_IMG_W[mediaRatio]} small:self-stretch`}
        >
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
                className="h-full w-full object-cover"
              />
            )}
          </div>
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
  descriptionFormat,
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
  videoControls,
  titleAlignment,
  hideTitle,
  displayWidthClass = "",
}: {
  alignImage: "left" | "right"
  sectionName: string | null
  sectionDescription: string | null
  descriptionFormat?: "plain" | "markdown" | null
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
  videoControls?: boolean | null
  titleAlignment: TitleAlignment
  hideTitle: boolean
  displayWidthClass?: string
}) {
  return (
    <div
      className={`mx-auto flex ${displayWidthClass} flex-col small:flex-row ${
        alignImage === "right" ? "small:flex-row-reverse" : ""
      }`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <TextSection
        name={sectionName}
        description={sectionDescription}
        descriptionFormat={descriptionFormat}
        textColor={textColor}
        titleAlignment={titleAlignment}
        hideTitle={hideTitle}
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
            videoControls={videoControls}
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
  sectionDescription,
  descriptionFormat,
  backgroundColor,
  textColor,
  titleAlignment,
  textStyle,
}: {
  style: ContentBlockStyle | null
  sectionDescription: string | null
  descriptionFormat?: "plain" | "markdown" | null
  backgroundColor: string | null
  textColor: string | null
  titleAlignment: TitleAlignment
  textStyle?: React.CSSProperties
}) {
  // Despite their names, NEITHER of these styles renders a title: the block's
  // `name` is not passed down to OnlyText at all. Both are simply N equal text
  // columns, so `titleAlignment` (a title-only setting) does not apply.
  if (style === "3_columns_title_left") {
    return (
      <MultiColumnText
        columns={3}
        sectionDescription={sectionDescription}
        descriptionFormat={descriptionFormat}
        backgroundColor={backgroundColor}
        textColor={textColor}
        textStyle={textStyle}
      />
    )
  }

  if (style === "2_columns_title_top_center") {
    return (
      <MultiColumnText
        columns={2}
        sectionDescription={sectionDescription}
        descriptionFormat={descriptionFormat}
        backgroundColor={backgroundColor}
        textColor={textColor}
        textStyle={textStyle}
      />
    )
  }

  return (
    <div
      className="mx-auto max-w-screen-xl py-10 small:py-16 px-6 small:px-12"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div
        className={`mx-auto max-w-[900px] ${titleAlignClass(
          titleAlignment,
          "text-center"
        )}`}
        style={textStyle}
      >
        <RichText
          value={sectionDescription}
          format={descriptionFormat}
          textColor={textColor}
        />
      </div>
    </div>
  )
}

/* ─── Multi-column text (3 Columns Title Left / 2 Columns Title Top Center) ─── */

/**
 * The two multi-column text styles render N EQUAL text columns and no title.
 * The admin editor packs one text section per column into the single stored
 * `description`, separated by the section-break marker, so column i renders
 * section i.
 *
 * `columns` MUST match the admin editor's `sectionCountForStyle` in
 * `saas-admin-ui/src/containers/ContentBlocks/utils/sectionMarker.ts`, or the
 * editor and this renderer disagree on the layout.
 */
function MultiColumnText({
  columns,
  sectionDescription,
  descriptionFormat,
  backgroundColor,
  textColor,
  textStyle,
}: {
  columns: 2 | 3
  sectionDescription: string | null
  descriptionFormat?: "plain" | "markdown" | null
  backgroundColor: string | null
  textColor: string | null
  textStyle?: React.CSSProperties
}) {
  // Legacy content may hold FEWER sections than the style has columns (e.g. a
  // 2-section string authored when this style had 2 text columns, now rendered
  // with 3), and a marker-less string yields exactly one. Index defensively so
  // the surplus columns render empty rather than crashing.
  const sections = splitSections(sectionDescription)
  // Written as whole literals so Tailwind's class scanner sees them.
  const gridClass = columns === 3 ? "small:grid-cols-3" : "small:grid-cols-2"

  return (
    <div
      className="py-10 small:py-12 content-container large:px-0 px-6"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className={`grid grid-cols-1 gap-8 ${gridClass} small:gap-12`}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} style={textStyle}>
            <RichText
              value={sections[i] ?? ""}
              format={descriptionFormat}
              textColor={textColor}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Only Image ──────────────────────────────────────────── */

function OnlyImage({ sectionImage }: { sectionImage: string | null }) {
  if (!sectionImage) return null

  return (
    <div className="mx-auto  text-center">
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
  videoControls,
  objectFitCover,
  displayWidthClass = "",
}: {
  videoType: "uploaded" | "youtube" | "vimeo" | null
  videoLink: string | null
  videoAutoplay: boolean | null
  videoLoop: boolean | null
  videoControls?: boolean | null
  objectFitCover: boolean | null
  displayWidthClass?: string
}) {
  return (
    <div className={`mx-auto ${displayWidthClass} text-center`}>
      <VideoPlayer
        videoType={videoType}
        videoLink={videoLink}
        videoAutoplay={videoAutoplay}
        videoLoop={videoLoop}
        videoControls={videoControls}
        objectFitCover={objectFitCover}
      />
    </div>
  )
}

/* ─── Button Block ────────────────────────────────────────── */

type LinkPage = {
  id: string
  page_profiles: { slug: string; language: string }[]
  ancestors?: LinkPageAncestor[] | null
}

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
  page: LinkPage | null
  languageCode: string
  backgroundColor: string | null
  textColor: string | null
}) {
  // Resolve href
  let href: string | null = null
  let target: string | undefined = undefined

  if (page) {
    href = buildLinkPageHref(page, languageCode)
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
        className="grid w-full overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(250px, 1fr))`,
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
              <div className="h-[450px] md:h-[600px] w-full">
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

// Block-level `display` union, re-declared locally for the gallery path so it
// doesn't couple to the block-level `display`/`displayWidthClass` variables
// above (the gallery's default is `content_width`, not `full_width`).
type GalleryDisplay = "full_width" | "content_width" | "text_width"

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
  display = "content_width",
  stageHeight,
}: {
  images: ContentBlockImage[]
  style: string | null
  display?: GalleryDisplay
  stageHeight?: number
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

  // Scroll-rhythm renders the FULL images array in one continuous horizontal
  // track (no pagination) and owns its own arrows/progress bar, so it bypasses
  // the page-splitting and page-based nav/progress UI below entirely.
  if (style === "scroll_rhythm") {
    return (
      <GalleryScrollRhythm
        images={images}
        display={display}
        stageHeight={stageHeight}
      />
    )
  }

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
              height: "min(90vw, 450px)",
            }}
          >
            <GalleryImage image={img} className="h-full w-full object-cover" />
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

/* ─── Gallery: Scroll Rhythm ───────────────────────────────── */

// Height rhythm: one full-height slot, then two shorter slots, repeating.
// Full slot height mirrors GallerySpreadHarmony's fixed desktop height scale
// (`clamp(400px, 60vw, 800px)`), and the short slot is ~72% of that so the
// top edges align (via `items-start`) while the shorter images leave
// whitespace below them.
const SCROLL_RHYTHM_FULL_HEIGHT = "clamp(400px, 60vw, 760px)"
const SCROLL_RHYTHM_SHORT_HEIGHT = "clamp(288px, 43vw, 547px)"
const SCROLL_RHYTHM_FULL_WIDTH = "clamp(320px, 34vw, 560px)"
const SCROLL_RHYTHM_SHORT_WIDTH = "clamp(260px, 26vw, 420px)"

function GalleryScrollRhythm({
  images,
  display = "content_width",
  stageHeight,
}: {
  images: ContentBlockImage[]
  display?: GalleryDisplay
  stageHeight?: number
}) {
  // Width class for the display-width box that wraps arrows + track +
  // progress bar. The track clips its horizontally-scrolling images at this
  // box's right edge (via `overflow-x-auto` + no right padding), so nothing
  // is visible past the selected width — full_width spans the viewport.
  const widthClass =
    display === "content_width"
      ? "content-container"
      : display === "text_width"
      ? "max-w-[900px] w-full"
      : ""

  // When a Custom Styles `maxHeight` is set on the block, it becomes the
  // gallery's own "stage height" instead of clipping the outer <section>
  // (see `galleryStageHeight` in the parent). Slot widths scale off it to
  // preserve the default clamp constants' aspect ratios (0.74 ≈ 560/760 for
  // the full slot, 0.77 ≈ 420/547 for the short slot). Falls back to the
  // responsive clamp defaults when absent/invalid.
  const hasStageHeight = typeof stageHeight === "number" && stageHeight > 0
  const fullH = hasStageHeight ? `${stageHeight}px` : SCROLL_RHYTHM_FULL_HEIGHT
  const shortH = hasStageHeight
    ? `${Math.round(stageHeight! * 0.72)}px`
    : SCROLL_RHYTHM_SHORT_HEIGHT
  const fullW = hasStageHeight
    ? `${Math.round(stageHeight! * 0.74)}px`
    : SCROLL_RHYTHM_FULL_WIDTH
  const shortW = hasStageHeight
    ? `${Math.round(stageHeight! * 0.72 * 0.77)}px`
    : SCROLL_RHYTHM_SHORT_WIDTH

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  // scrollProgress: 0..1 fraction of the max scroll offset already traveled.
  // indicatorWidth: % of the track currently visible (clientWidth/scrollWidth),
  // geometry-accurate for variable-width (full/short) slots — defaults to a
  // full, unscrolled bar so the very first paint (before layout is measured)
  // never divides by zero.
  const [scrollProgress, setScrollProgress] = useState(0)
  const [indicatorWidth, setIndicatorWidth] = useState(100)

  // Single handler drives both the arrow disabled-states (child-categories
  // carousel convention) and the progress-bar fill (spread-harmony's
  // scrollLeft / (scrollWidth - clientWidth) math) off the same scroll event.
  const updateScrollState = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1)

    const maxScroll = scrollWidth - clientWidth
    if (maxScroll <= 0) {
      // No overflow (track fits within the viewport) — avoid 0/0 = NaN and
      // just show a full bar pinned to the left.
      setScrollProgress(0)
      setIndicatorWidth(100)
    } else {
      setScrollProgress(scrollLeft / maxScroll)
      setIndicatorWidth((clientWidth / scrollWidth) * 100)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // Force the initial scroll position to 0 before the first measurement.
    // Without this, CSS scroll-snap (when present) can pull the container
    // past its own left padding on load; with snapping removed below this is
    // now just a deterministic belt-and-suspenders reset.
    container.scrollLeft = 0
    updateScrollState()

    container.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)

    return () => {
      container.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [updateScrollState])

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.6
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (images.length === 0) return null

  const indicatorPosition = scrollProgress * (100 - indicatorWidth)

  return (
    <div className={`mx-auto ${widthClass} px-6 large:px-0`}>
      {/* Navigation arrows — top-right, hidden on mobile. Sits inside the
          display-width box, so it shares its gutter with the track/progress
          bar below instead of inset-ing to its own content-container. */}
      <div className="mb-4 hidden items-center justify-end gap-2 small:flex">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={`p-2 transition-opacity ${
            canScrollLeft
              ? "opacity-100 hover:opacity-70"
              : "opacity-30 cursor-default"
          }`}
          aria-label="Previous images"
        >
          <ArrowLeft
            size="20"
            color={canScrollLeft ? "dark-blue" : "dark-blue-70"}
          />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={`p-2 transition-opacity ${
            canScrollRight
              ? "opacity-100 hover:opacity-70"
              : "opacity-30 cursor-default"
          }`}
          aria-label="Next images"
        >
          <ArrowRight
            size="20"
            color={canScrollRight ? "dark-blue" : "dark-blue-70"}
          />
        </button>
      </div>

      {/* Continuous horizontal track — ALL images, no pagination. Top-aligned
          (`items-start`) so the full/short height rhythm creates whitespace
          below the shorter slots instead of stretching them.
          No horizontal padding here: the display-width box above already
          supplies both gutters (`px-6 large:px-0`), and `overflow-x-auto`
          clips the track at that box's right edge — the trailing image is
          cut off there instead of bleeding to the viewport edge, which is
          the scroll affordance for this width.
          NOTE: intentionally no CSS scroll-snap here (this is a free-scroll
          gallery, not paginated) — `snap-x`/`snap-start` were removed because
          scroll-snap pulled the container's initial `scrollLeft` past its own
          left gutter on load, misaligning image 0 against the arrows/progress
          bar. */}
      <div
        ref={scrollRef}
        className="no-scrollbar flex items-start gap-6 overflow-x-auto scroll-smooth"
      >
        {images.map((img, i) => {
          const isFull = i % 3 === 0

          return (
            <div
              key={img.id}
              className="shrink-0 overflow-hidden"
              style={{
                width: isFull ? fullW : shortW,
                height: isFull ? fullH : shortH,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )
        })}
      </div>

      {/* Bottom progress bar — scroll-driven (spread-harmony's math). Shares
          the display-width box's gutter, same as the arrows above. */}
      {images.length > 1 && (
        <div className="mt-4">
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
    </div>
  )
}

/* ─── Product Grid ────────────────────────────────────────── */

function ProductGrid({
  products,
  title,
  description,
  descriptionFormat,
  languageCode,
  backgroundColor,
  textColor,
  titleAlignment,
  hideTitle,
}: {
  products: ProductContainer[]
  title: string | null
  description: string | null
  descriptionFormat?: "plain" | "markdown" | null
  languageCode: string
  backgroundColor: string | null
  textColor: string | null
  titleAlignment: TitleAlignment
  hideTitle: boolean
}) {
  if (products.length === 0 && !title && !description) return null

  return (
    <div
      className="py-10 small:py-12 content-container large:px-0 px-6"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {!hideTitle && title && (
        <h3
          className={`mb-6 eyebrow small:mb-6 ${titleAlignClass(
            titleAlignment,
            "text-left"
          )}`}
          style={textColor ? { color: textColor } : undefined}
        >
          {title.split("\\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < title.split("\\n").length - 1 && <br />}
            </span>
          ))}
        </h3>
      )}
      <RichText
        value={description}
        format={descriptionFormat}
        textColor={textColor}
        className="mb-8"
      />
      {products.length > 0 && (
        <ProductCarouselGrid
          products={products}
          language={languageCode as SupportedLanguage}
        />
      )}
    </div>
  )
}

/* ─── Page Grid ───────────────────────────────────────────── */

// Resolve a tag's localized display name: profile matching the active
// language, else the first profile's name, else null (skip).
function resolveTagLabel(
  tag: NonNullable<GridPage["tags"]>[number],
  languageCode: string
): string | null {
  const profiles = tag.page_tag_profiles ?? []
  const match = profiles.find(
    (p) => p.language?.toLowerCase() === languageCode.toLowerCase()
  )
  return match?.name || profiles[0]?.name || null
}

type GridTag = NonNullable<GridPage["tags"]>[number]

function PageGrid({
  pages,
  tags,
  title,
  description,
  descriptionFormat,
  languageCode,
  backgroundColor,
  textColor,
  showTags,
  selectedTagSlug,
  titleAlignment,
  hideTitle,
}: {
  pages: GridPage[]
  tags: GridTag[]
  title: string | null
  description: string | null
  descriptionFormat?: "plain" | "markdown" | null
  languageCode: string
  backgroundColor: string | null
  textColor: string | null
  showTags: boolean
  selectedTagSlug?: string | null
  titleAlignment: TitleAlignment
  hideTitle: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Build an href for the current path with `tag` set to the given slug, or
  // removed entirely (slug === null = the "All" pill). Other query params are
  // preserved so unrelated state in the URL survives a pill click.
  const buildTagHref = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      if (slug) {
        params.set("tag", slug)
      } else {
        params.delete("tag")
      }
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    },
    [pathname, searchParams]
  )

  if (pages.length === 0 && !title && !description) return null

  // Pills come pre-computed from the server (distinct in-scope tags). Resolve
  // each tag's localized label, skipping tags with no usable profile.
  const pillTags = showTags
    ? tags
        .map((tag) => ({
          slug: tag.slug,
          label: resolveTagLabel(tag, languageCode),
        }))
        .filter((t): t is { slug: string; label: string } => Boolean(t.label))
    : []

  // Pages already arrive filtered from the server; render them directly.
  const visiblePages = pages

  return (
    <div
      className="py-10 small:py-12 content-container large:px-0 px-6"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {!hideTitle && title && (
        <h3
          className={`mb-6 eyebrow small:mb-6 ${titleAlignClass(
            titleAlignment,
            "text-left"
          )}`}
          style={textColor ? { color: textColor } : undefined}
        >
          {title.split("\\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < title.split("\\n").length - 1 && <br />}
            </span>
          ))}
        </h3>
      )}
      <RichText
        value={description}
        format={descriptionFormat}
        textColor={textColor}
        className="mb-8"
      />
      {showTags && pillTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href={buildTagHref(null)}
            scroll={false}
            className={`rounded-full px-3 py-2 text-sm ${
              !selectedTagSlug
                ? "bg-gold text-white"
                : "bg-white/80 text-gray-600 border border-gray-300"
            }`}
          >
            All
          </Link>
          {pillTags.map((tag) => (
            <Link
              key={tag.slug}
              href={buildTagHref(tag.slug)}
              scroll={false}
              className={`rounded-full px-3 py-2 text-sm ${
                selectedTagSlug === tag.slug
                  ? "bg-gold text-white"
                  : "bg-white/80 text-gray-600 border border-gray-300"
              }`}
            >
              {tag.label}
            </Link>
          ))}
        </div>
      )}
      {visiblePages.length > 0 && (
        <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
          {visiblePages.map((page) => {
            const pageProfile =
              page.page_profiles.find(
                (p) => p.language.toLowerCase() === languageCode.toLowerCase()
              ) ?? page.page_profiles[0]

            const href = buildLinkPageHref(page, languageCode) ?? "#"
            const imageSrc = page.hero_image?.src

            const badgeLabel =
              showTags && page.tags?.[0]
                ? resolveTagLabel(page.tags[0], languageCode)
                : null

            return (
              <li key={page.id}>
                <a href={href} className="group block">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    {badgeLabel && (
                      <span className="absolute top-3 left-3 z-10 rounded-full bg-gold-30 px-3 py-2 text-sm text-dark-blue">
                        {badgeLabel}
                      </span>
                    )}
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt={pageProfile?.title ?? ""}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  {pageProfile?.title && (
                    <p
                      className="mt-3 text-sm font-medium"
                      style={textColor ? { color: textColor } : undefined}
                    >
                      {pageProfile.title}
                    </p>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
