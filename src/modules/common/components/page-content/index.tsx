interface PageContentProps {
  children: React.ReactNode
  className?: string
}

export default function PageContent({ children, className }: PageContentProps) {
  return (
    <div
      className={`content-container px-6 large:px-0 py-6${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  )
}
