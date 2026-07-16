import React from "react"

type ProductSectionProps = {
  title?: string
  divider?: boolean
  className?: string
  children: React.ReactNode
}

const ProductSection = ({
  title,
  divider,
  className,
  children,
}: ProductSectionProps) => (
  <section className={`pb-8 ${className ?? ""}`}>
    {divider && <hr className="border-t border-gray-300 mb-8" />}
    {title && <h3 className="mb-6 font-medium text-dark-blue">{title}</h3>}
    {children}
  </section>
)

export default ProductSection
