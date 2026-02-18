"use client"

import { Heading } from "@medusajs/ui"
import type { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface PageHeroProps {
  title: string | null
  subtitle: string | null
  heroImageSrc: string | null
  breadcrumbItems?: BreadcrumbItem[]
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className}
  >
    <path
      d="M6 3L11 8L6 13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PageHero = ({
  title,
  subtitle,
  heroImageSrc,
  breadcrumbItems,
}: PageHeroProps) => {
  if (!title && !subtitle) {
    return null
  }

  if (heroImageSrc) {
    return (
      <div className="relative w-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          role="img"
          aria-label={title ?? "Page hero image"}
          style={{ backgroundImage: `url('${encodeURI(heroImageSrc)}')` }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-10 sm:px-12 lg:px-14 min-h-[350px] md:min-h-[500px] flex flex-col py-8 sm:py-10">
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center flex-wrap gap-3 text-sm">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1
                  return (
                    <li key={index} className="flex items-center gap-3">
                      {item.href ? (
                        <LocalizedClientLink
                          href={item.href}
                          className="text-white/80 hover:text-white transition-colors"
                        >
                          {item.label}
                        </LocalizedClientLink>
                      ) : (
                        <span className="text-white font-medium">
                          {item.label}
                        </span>
                      )}
                      {!isLast && (
                        <span aria-hidden="true">
                          <ChevronRight className="text-white/60 flex-shrink-0" />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>
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
  }

  return (
    <div className="w-full bg-ui-bg-subtle py-8 sm:py-10 px-10 sm:px-12 lg:px-14">
      <div className="max-w-[1440px] mx-auto">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center flex-wrap gap-3 text-sm">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1
                return (
                  <li key={index} className="flex items-center gap-3">
                    {item.href ? (
                      <LocalizedClientLink
                        href={item.href}
                        className="text-gray-500 hover:text-dark-blue transition-colors"
                      >
                        {item.label}
                      </LocalizedClientLink>
                    ) : (
                      <span className="text-dark-blue font-medium">
                        {item.label}
                      </span>
                    )}
                    {!isLast && (
                      <span aria-hidden="true">
                        <ChevronRight className="text-gray-400 flex-shrink-0" />
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
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
