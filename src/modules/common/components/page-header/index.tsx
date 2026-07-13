import Breadcrumb, {
  BreadcrumbItem,
} from "@modules/common/components/breadcrumb"

interface PageHeaderProps {
  title?: string
  description?: string | null
  breadcrumbItems?: BreadcrumbItem[]
}

export default function PageHeader({
  title,
  description,
  breadcrumbItems,
}: PageHeaderProps) {
  return (
    <div className="bg-page-background w-full px-6 large:px-0">
      <div className="content-container py-8">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}

        {title && (
          <h1 className="page-title" data-testid="page-header-title">
            {title}
          </h1>
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
