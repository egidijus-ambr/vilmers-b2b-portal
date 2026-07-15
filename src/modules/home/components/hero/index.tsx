import { Fragment } from "react"
import { Github } from "@medusajs/icons"
import { Button, Heading } from "@medusajs/ui"
import OutlineButton from "@modules/common/components/outline-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CmsCtaButton from "@modules/common/components/cms-cta-button"
import type { CtaLike, LinkPageLike } from "@modules/home/components/content-block/linkResolver"
import { retrieveCustomer } from "@lib/data/customer"
import { getServerT } from "@lib/i18n/server-translations"
import { SupportedLanguage } from "@lib/i18n"
import { activeTheme } from "themes"
import HeroVideo from "./hero-video"

interface HeroProps {
  params: Promise<{ languageCode: string }>
  heroImageSrc?: string | null
  title?: string | null
  subtitle?: string | null
  heroHeight?: string | null
  heroVideoSrc?: string | null
  ctaLabel?: string | null
  ctaLink?: string | null
  ctaLinkPage?: LinkPageLike | null
  ctaLinkType?: CtaLike["cta_link_type"]
  ctaLinkCategory?: CtaLike["cta_link_category"]
  ctaNewTab?: boolean | null
  languageCode?: string
}

// CMS "Title"/"Subtitle" fields are single-line inputs, so authors type the
// literal two-character sequence `\n` where they want a line break. Also
// tolerate real newline characters in case the field is ever a textarea.
function renderWithLineBreaks(text: string) {
  return text.split(/\\n|\r?\n/).map((line, i, arr) => (
    <Fragment key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </Fragment>
  ))
}

const Hero = async ({
  params,
  heroImageSrc,
  title,
  subtitle,
  heroHeight,
  heroVideoSrc,
  ctaLabel,
  ctaLink,
  ctaLinkPage,
  ctaLinkType,
  ctaLinkCategory,
  ctaNewTab,
  languageCode,
}: HeroProps) => {
  const customer = await retrieveCustomer()
  const resolvedParams = await params
  const language = resolvedParams.languageCode as SupportedLanguage
  const t = await getServerT("common", language)
  // The hero slides UNDER the nav (negative margin + compensating top
  // padding) only when the nav is transparent-over-hero at the top of the
  // homepage (see nav/index.tsx). When the nav is always solid, the overlap
  // is dropped so the solid nav doesn't cover the top of the hero.
  const { transparent, showCta } = activeTheme.layout.homepageHeader
  const backgroundImageSrc =
    heroImageSrc || "/images/home_page_background.png"
  // An authored CTA (label + resolvable link) takes precedence over the
  // theme's hardcoded login/account button; falls back to current behavior
  // (showCta) when no CTA is configured. `ctaLinkType` covers the
  // `category`/`store` targets, which resolve without a `ctaLinkPage`.
  const hasCta = Boolean(ctaLabel && (ctaLinkPage || ctaLink || ctaLinkType))
  return (
    <div
      className={`w-full border-b border-ui-border-base relative bg-hero-background ${
        transparent ? "-mt-[var(--nav-height)]" : ""
      }`}
      style={{ height: heroHeight ?? "70vh" }}
    >
      {/* Background Image (always present: instant paint + video fallback/poster) */}
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[2150px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${backgroundImageSrc}')`,
        }}
      />

      {/* Hero Video (optional, progressive enhancement over the image above) */}
      {heroVideoSrc && (
        <HeroVideo videoSrc={heroVideoSrc} poster={backgroundImageSrc} />
      )}

      {/* Overlay for better text readability */}
      <div className="absolute inset-0" />

      {/* Content */}
      <div
        className={`absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6 ${
          transparent ? "pt-[var(--nav-height)]" : ""
        }`}
      >
        <span>
          {title ? (
            <>
              <Heading
                level="h1"
                className="text-6xl font-medium  text-white font-normal drop-shadow-lg "
              >
                {renderWithLineBreaks(title)}
              </Heading>
              {subtitle && (
                <Heading
                  level="h2"
                  className="text-6xl font-medium  text-white font-normal drop-shadow-lg leading-[72px]"
                >
                  {renderWithLineBreaks(subtitle)}
                </Heading>
              )}
            </>
          ) : (
            <>
              <Heading
                level="h1"
                className="text-6xl font-medium  text-white font-normal drop-shadow-lg "
              >
                Comfort and quality
              </Heading>
              <Heading
                level="h2"
                className="text-6xl font-medium  text-white font-normal drop-shadow-lg leading-[72px]"
              >
                with smart design.
              </Heading>
            </>
          )}
          {hasCta ? (
            <div className="flex items-center justify-center gap-x-4 mt-10">
              <CmsCtaButton
                label={ctaLabel ?? null}
                link={ctaLink ?? null}
                linkPage={ctaLinkPage ?? null}
                linkType={ctaLinkType}
                linkCategory={ctaLinkCategory}
                newTab={ctaNewTab ?? null}
                languageCode={languageCode ?? language}
                onImage
              />
            </div>
          ) : (
            showCta && (
              <div className="flex items-center justify-center gap-x-4 mt-10">
                <LocalizedClientLink href={customer ? "/account" : "/account"}>
                  <OutlineButton showArrow>
                    {customer ? t("overview") : t("log-in")}
                  </OutlineButton>
                </LocalizedClientLink>
              </div>
            )
          )}
        </span>
        <a
          href="https://github.com/medusajs/nextjs-starter-medusa"
          target="_blank"
          rel="noopener noreferrer"
        ></a>
      </div>
    </div>
  )
}

export default Hero
