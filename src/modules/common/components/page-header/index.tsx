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
}: PageHeaderProps) {
  const Tag = level

  return (
    <div className="bg-page-background w-full px-6 large:px-0">
      <div className="content-container py-8">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
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
