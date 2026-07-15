import {
  resolveCtaHref,
  type CtaLike,
  type LinkPageLike,
} from "@modules/home/components/content-block/linkResolver"
import ArrowRight from "@modules/common/icons/arrow-right"

export interface CmsCtaButtonProps {
  /** Per-language authored label. Nothing renders when this is missing. */
  label: string | null
  /** External URL (used only when no internal target resolves). */
  link: string | null
  /** Internal page target — takes precedence over `link` when present. */
  linkPage: LinkPageLike | null
  /**
   * Discriminator selecting which internal target `linkPage`/`linkCategory`
   * refers to (`cms_page` | `category` | `store`). Optional/nullable so
   * CTAs authored before this field existed keep resolving via `linkPage`
   * (see `resolveCtaHref`'s legacy fallback).
   */
  linkType?: CtaLike["cta_link_type"]
  /** Internal category target — used when `linkType` is `"category"`. */
  linkCategory?: CtaLike["cta_link_category"]
  /** Open the (external) link in a new tab. Ignored for internal targets. */
  newTab: boolean | null
  languageCode: string
  variant?: "primary" | "secondary" | "outline"
  /**
   * When true, the CTA sits over an image and is rendered as the hero's
   * transparent "OutlineButton" pill (white border, white text, trailing
   * arrow) instead of the default filled style. Matches
   * `@modules/common/components/outline-button` exactly.
   */
  onImage?: boolean
  className?: string
}

// The CTA is always a link, so it must render as a single <a> — it cannot
// wrap the shared `Button` (`@modules/common/components/button`), which
// renders a native <button>. `<a><button>...</button></a>` is invalid
// interactive-content-in-interactive-content DOM nesting. Since `Button`
// has no polymorphic/anchor mode, this mirrors the same "styled <a>"
// pattern `ButtonBlock` uses in
// `@modules/home/components/content-block/index.tsx`, reusing Button's own
// variant tokens below so the rendered styling stays identical.
const BASE_CLASSES =
  "inline-block px-8 py-3 text-sm font-medium rounded-button border transition-all"
const VARIANT_CLASSES: Record<
  NonNullable<CmsCtaButtonProps["variant"]>,
  string
> = {
  primary: "border-dark-blue bg-dark-blue text-white hover:opacity-90",
  secondary: "border-accent bg-accent text-white hover:bg-accent/90",
  outline: "border-dark-blue text-dark-blue hover:bg-gray-50",
}

// Same classes as `@modules/common/components/outline-button` (the hero's
// existing "Login →" pill): transparent bg, white border/text, rounded pill,
// inverts on hover. Used verbatim so the "on image" CTA matches exactly.
const ON_IMAGE_CLASSES =
  "inline-flex items-center px-6 py-3 border border-white text-white hover:bg-white hover:text-black transition-colors duration-200 rounded-3xl"

/**
 * Server-safe (no hooks, no "use client") CTA button for CMS-authored
 * content: the home hero, nested-CMS page hero, and the Text-on-Image
 * content block. Resolves an internal target (`linkType` discriminating
 * between `linkPage`/`linkCategory`/the store, via `resolveCtaHref`) or an
 * external URL (`link`), and renders a single styled `<a>` carrying the
 * button styling. Renders nothing when there is no label or no resolvable
 * href.
 */
export default function CmsCtaButton({
  label,
  link,
  linkPage,
  linkType,
  linkCategory,
  newTab,
  languageCode,
  variant,
  onImage = false,
  className,
}: CmsCtaButtonProps) {
  if (!label) return null

  let href: string | null = null
  let target: string | undefined
  let rel: string | undefined

  const internalHref = resolveCtaHref(
    {
      cta_link_type: linkType ?? null,
      cta_link_page: linkPage,
      cta_link_category: linkCategory ?? null,
    },
    languageCode
  )

  if (internalHref) {
    href = internalHref
  } else if (link) {
    href = link
    if (newTab) {
      target = "_blank"
      rel = "noopener noreferrer"
    }
  }

  if (!href) return null

  if (onImage) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={`${ON_IMAGE_CLASSES}${className ? ` ${className}` : ""}`}
      >
        {label}
        <ArrowRight className="ml-2 -translate-y-[1px]" color="currentColor" />
      </a>
    )
  }

  const variantClasses = VARIANT_CLASSES[variant ?? "primary"]

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={`${BASE_CLASSES} ${variantClasses}${
        className ? ` ${className}` : ""
      }`}
    >
      {label}
    </a>
  )
}
