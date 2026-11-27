import { clx } from "@medusajs/ui"
import Breadcrumb, {
  BreadcrumbItem,
} from "@modules/common/components/breadcrumb"

interface PageHeaderProps {
  title?: string
  description?: string | null
  breadcrumbItems?: BreadcrumbItem[]
  level?: "h1" | "h2"
  /**
   * Visual size override, independent of the semantic `level`.
   *
   * Normally the rendered tag (h1/h2/...) decides the font size via the
   * base `@layer base` rules in globals.css. This prop is the deliberate
   * escape hatch for the rare case where the semantic level and the visual
   * size must differ — e.g. a public page that needs an `<h1>` for SEO but
   * shouldn't render at the full 56px h1 size. Defaults to `level`, so
   * existing consumers are unaffected.
   */
  titleSize?: "h1" | "h2"
  /**
   * For breadcrumb-only headers (no title/description): add the same 12px gap
   * below the breadcrumb that a title gets via `BREADCRUMB_TITLE_GAP`, so the
   * content below doesn't sit flush against the crumb. Opt-in because CMS
   * pages (heroDisplay="none") also render breadcrumb-only.
   */
  spaceBelowBreadcrumb?: boolean
}

// Gap between the breadcrumb block and what follows it. Keep both in sync:
// `mt-3` when a title follows, `pb-3` when the header is breadcrumb-only.
const BREADCRUMB_TITLE_GAP = "mt-3"
const BREADCRUMB_ONLY_GAP = "pb-3"

// Space below the title/description block before the page content. 16px on
// phones, 24px from `xsmall` (512px) up.
const BODY_BOTTOM_PADDING = "pb-4 xsmall:pb-6"

const TITLE_SIZE_CLASSES: Record<"h1" | "h2", string> = {
  h1: "text-heading-1 small:text-heading-1-lg",
  h2: "text-heading-2 small:text-heading-2-lg",
}

export default function PageHeader({
  title,
  description,
  breadcrumbItems,
  level = "h1",
  titleSize = level,
  spaceBelowBreadcrumb = false,
}: PageHeaderProps) {
  const Tag = level
  const hasBreadcrumb = !!breadcrumbItems && breadcrumbItems.length > 0
  const hasBody = !!title || !!description

  return (
    <div className="bg-page-background w-full page-gutter">
      <div
        className={clx(
          "content-container",
          // The breadcrumb owns its own vertical padding; only add top
          // padding when it is absent, and bottom padding when there is
          // content below it (a breadcrumb-only header ends at the crumb).
          !hasBreadcrumb && "pt-8",
          hasBody && BODY_BOTTOM_PADDING,
          hasBreadcrumb &&
            !hasBody &&
            spaceBelowBreadcrumb &&
            BREADCRUMB_ONLY_GAP
        )}
      >
        {hasBreadcrumb && <Breadcrumb items={breadcrumbItems!} />}

        {title && (
          <Tag
            className={clx(
              "page-title",
              hasBreadcrumb && BREADCRUMB_TITLE_GAP,
              titleSize !== level && TITLE_SIZE_CLASSES[titleSize]
            )}
            data-testid="page-header-title"
          >
            {title}
          </Tag>
        )}

        {description && (
          <p className="mt-4 text-base leading-6 font-normal text-dark-blue max-w-[542px]">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
