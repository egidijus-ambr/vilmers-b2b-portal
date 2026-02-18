interface PageContentProps {
  children: React.ReactNode
  className?: string
}

export default function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={`content-container py-6${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  )
}
