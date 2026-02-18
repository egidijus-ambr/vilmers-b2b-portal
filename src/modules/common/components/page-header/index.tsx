import Breadcrumb, {
  BreadcrumbItem,
} from "@modules/common/components/breadcrumb"

interface PageHeaderProps {
  title?: string
  description?: string | null
  breadcrumbItems?: BreadcrumbItem[]
  children?: React.ReactNode
}

export default function PageHeader({
  title,
  description,
  breadcrumbItems,
  children,
}: PageHeaderProps) {
  return (
    <div className="bg-gold-10 w-full">
      <div className="max-w-[1360px] w-full mx-auto py-8">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}

        {title && (
          <h1
            className="text-2xl sm:text-3xl font-medium text-dark-blue"
            data-testid="page-header-title"
          >
            {title}
          </h1>
        )}

        {description && (
          <p className="mt-4 text-base leading-6 font-normal text-dark-blue max-w-[542px]">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  )
}
