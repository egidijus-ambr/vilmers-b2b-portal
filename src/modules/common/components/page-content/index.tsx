interface PageContentProps {
  children: React.ReactNode
  className?: string
  /** When true, removes horizontal padding on mobile so content goes edge-to-edge at all sizes below the large: breakpoint. */
  noPaddingX?: boolean
}

export default function PageContent({ children, className, noPaddingX }: PageContentProps) {
  return (
    <div
      className={`content-container large:px-0 ${noPaddingX ? "" : "px-6"}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  )
}
