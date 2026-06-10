"use client"

import { Heading } from "@medusajs/ui"
import Breadcrumb, {
  BreadcrumbItem,
} from "@modules/common/components/breadcrumb"
import PageHeader from "@modules/common/components/page-header"

interface PageHeroProps {
  title: string | null
  subtitle: string | null
  heroImageSrc: string | null
  heroDisplay?: "full_width" | "content_width" | "none" | null
  breadcrumbItems?: BreadcrumbItem[]
}

const PageHero = ({
  title,
  subtitle,
  heroImageSrc,
  heroDisplay,
  breadcrumbItems,
}: PageHeroProps) => {
  if (!title && !subtitle) {
    return null
  }

  const showImage = !!heroImageSrc && heroDisplay !== "none"

  if (showImage) {
    const isContentWidth = heroDisplay === "content_width"

    const imageHero = (
      <div
        className={`relative w-full${
          isContentWidth ? " overflow-hidden rounded-lg" : ""
        }`}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          role="img"
          aria-label={title ?? "Page hero image"}
          style={{ backgroundImage: `url('${encodeURI(heroImageSrc!)}')` }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 w-full max-w-[1360px] mx-auto  min-h-[350px] md:min-h-[500px] flex flex-col py-8 px-6 large:px-0">
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <Breadcrumb items={breadcrumbItems} variant="light" />
          )}
          <div className="flex flex-col items-center text-center flex-1 justify-center">
            {title && (
              <Heading
                level="h1"
                className="text-4xl font-medium text-white drop-shadow-lg"
              >
                {title}
              </Heading>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-white/90 max-w-2xl drop-shadow">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    )

    if (isContentWidth) {
      return <div className="content-container">{imageHero}</div>
    }

    return imageHero
  }

  // No hero: reuse the shared PageHeader (breadcrumbs + left-aligned title),
  // matching the account/orders and product page layout.
  if (heroDisplay === "none") {
    return (
      <PageHeader
        title={title ?? undefined}
        description={subtitle}
        breadcrumbItems={breadcrumbItems}
      />
    )
  }

  return (
    <div className="w-full bg-ui-bg-subtle py-8 sm:py-10 px-10 sm:px-12 lg:px-14">
      <div className="max-w-[1360px] mx-auto">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}
        <div className="flex flex-col items-center text-center">
          {title && (
            <Heading
              level="h1"
              className="text-4xl font-medium text-ui-fg-base"
            >
              {title}
            </Heading>
          )}
          {subtitle && (
            <p className="mt-4 text-lg text-ui-fg-subtle max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PageHero
