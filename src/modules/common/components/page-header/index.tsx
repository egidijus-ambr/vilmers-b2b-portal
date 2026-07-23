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
   * Condenses the dead space below the breadcrumb when there is no title.
   *
   * The top padding stays `pt-8` (identical to the default `py-8`'s top
   * half) so the breadcrumb's vertical position never moves. Only the
   * space that would otherwise separate the breadcrumb from a title is
   * reduced: the container's bottom padding drops to `pb-2`, and the
   * breadcrumb's own `mb-8` (normally the gap before the title) shrinks
   * to `mb-2`.
   *
   * Intended for consumers that render this header with breadcrumb-only
   * content (e.g. CMS pages with `heroDisplay === "none"`), where the full
   * `py-8` + breadcrumb `mb-8` wastes vertical space. Defaults to `false`
   * so every existing consumer (cart, checkout, search, account,
   * categories, collections, product pages, etc.) keeps its current
   * `py-8` container padding and `mb-8` breadcrumb margin untouched.
   */
  compact?: boolean
}

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
  compact = false,
}: PageHeaderProps) {
  const Tag = level

  return (
    <div className="bg-page-background w-full px-6 large:px-0">
      <div className={clx("content-container", compact ? "pt-8 pb-2" : "py-8")}>
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} compact={compact} />
        )}

        {title && (
          <Tag
            className={clx(
              "page-title",
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
