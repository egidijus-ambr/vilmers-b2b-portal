"use client"

import { Heading } from "@medusajs/ui"
import Breadcrumb, {
  BreadcrumbItem,
} from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"
import CmsCtaButton from "@modules/common/components/cms-cta-button"
import type { CtaLike, LinkPageLike } from "@modules/home/components/content-block/linkResolver"

interface PageHeroProps {
  title: string | null
  subtitle: string | null
  heroImageSrc: string | null
  heroDisplay?: "full_width" | "content_width" | "none" | null
  heroHeight?: string | null
  breadcrumbItems?: BreadcrumbItem[]
  ctaLabel?: string | null
  ctaLink?: string | null
  ctaLinkPage?: LinkPageLike | null
  ctaLinkType?: CtaLike["cta_link_type"]
  ctaLinkCategory?: CtaLike["cta_link_category"]
  ctaNewTab?: boolean | null
  languageCode?: string
}

const PageHero = ({
  title,
  subtitle,
  heroImageSrc,
  heroDisplay,
  heroHeight,
  breadcrumbItems,
  ctaLabel,
  ctaLink,
  ctaLinkPage,
  ctaLinkType,
  ctaLinkCategory,
  ctaNewTab,
  languageCode,
}: PageHeroProps) => {
  // The CTA renders differently depending on whether it sits over the
  // background image (transparent OutlineButton-style pill) or on a plain
  // background (filled style), so it's built per-branch rather than as a
  // single shared node.
  const renderCta = (onImage: boolean) => (
    <CmsCtaButton
      label={ctaLabel ?? null}
      link={ctaLink ?? null}
      linkPage={ctaLinkPage ?? null}
      linkType={ctaLinkType}
      linkCategory={ctaLinkCategory}
      newTab={ctaNewTab ?? null}
      languageCode={languageCode ?? "en"}
      onImage={onImage}
      className="mt-6"
    />
  )
  if (!title && !subtitle) {
    return null
  }

  const showImage = !!heroImageSrc && heroDisplay !== "none"

  if (showImage) {
    const isContentWidth = heroDisplay === "content_width"

    const imageHero = (
      <div
        className={`relative w-full mb-6${
          isContentWidth ? " overflow-hidden rounded-lg" : ""
        }`}
        style={heroHeight ? { height: heroHeight } : undefined}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          role="img"
          aria-label={title ?? "Page hero image"}
          style={{ backgroundImage: `url('${encodeURI(heroImageSrc!)}')` }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div
          className={`relative z-10 w-full max-w-[1360px] mx-auto ${
            heroHeight ? "h-full" : "min-h-[350px] md:min-h-[500px]"
          } flex flex-col py-8 px-6 large:px-0`}
        >
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} variant="light" />
          )}
          <div className="flex flex-col items-center text-center flex-1 justify-center">
            {title && (
              <Heading
                level="h1"
                className="text-[2.5rem] small:text-[3.5rem] font-medium text-white drop-shadow-lg leading-tight"
              >
                {title}
              </Heading>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-white/90 max-w-2xl drop-shadow">
                {subtitle}
              </p>
            )}
            {renderCta(true)}
          </div>
        </div>
      </div>
    )

    if (isContentWidth) {
      return <div className="content-container">{imageHero}</div>
    }

    return imageHero
  }

  // No hero: reuse the shared PageHeader, but breadcrumb-only — the page
  // title is intentionally not rendered in this mode. PageHeader already
  // skips its title element entirely when `title` is falsy/omitted (see
  // its `{title && (...)}` guard), so simply not passing it here hides the
  // title without emitting an empty heading and without touching
  // PageHeader's other consumers (account/orders/product pages).
  if (heroDisplay === "none") {
    return (
      <PageHeader
        description={subtitle}
        breadcrumbItems={breadcrumbItems}
        compact
      />
    )
  }

  return (
    <div className="w-full bg-page-background py-8 sm:py-10 px-10 sm:px-12 lg:px-14">
      <div className="max-w-[1360px] mx-auto">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}
        <div className="flex flex-col items-center text-center">
          {title && (
            <Heading
              level="h1"
              className="text-[2.5rem] small:text-[3.5rem] font-medium text-ui-fg-base leading-tight"
            >
              {title}
            </Heading>
          )}
          {subtitle && (
            <p className="mt-4 text-lg text-ui-fg-subtle max-w-2xl">
              {subtitle}
            </p>
          )}
          {renderCta(false)}
        </div>
      </div>
    </div>
  )
}

export default PageHero
