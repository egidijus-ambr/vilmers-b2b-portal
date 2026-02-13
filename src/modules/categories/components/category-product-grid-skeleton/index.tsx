export default function CategoryProductGridSkeleton() {
  return (
    <div data-testid="category-product-grid-skeleton">
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {Array.from({ length: 28 }).map((_, i) => (
          <li key={i} className="animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="aspect-[325/380] w-full bg-gold-10" />
              <div className="flex flex-col gap-1">
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-4 w-1/3 rounded bg-gray-100" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
