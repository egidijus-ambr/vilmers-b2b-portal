"use client"

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = []

  if (currentPage <= 4) {
    // Near the start: 1 2 3 4 5 ... last
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push("ellipsis")
    pages.push(totalPages)
  } else if (currentPage >= totalPages - 3) {
    // Near the end: 1 ... last-4 last-3 last-2 last-1 last
    pages.push(1)
    pages.push("ellipsis")
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
  } else {
    // Middle: 1 ... prev curr next ... last
    pages.push(1)
    pages.push("ellipsis")
    pages.push(currentPage - 1)
    pages.push(currentPage)
    pages.push(currentPage + 1)
    pages.push("ellipsis")
    pages.push(totalPages)
  }

  return pages
}

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null

  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex justify-center w-full py-6">
      <div className="flex items-center gap-1 md:gap-2">
        {/* Previous arrow */}
        <button
          onClick={() => hasPreviousPage && onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-lg transition-colors ${
            hasPreviousPage
              ? "text-dark-blue hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          }`}
          aria-label="Previous page"
        >
          &#8592;
        </button>

        {/* Page numbers */}
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-sm text-gray-400"
            >
              &hellip;
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-xs md:text-sm font-medium transition-colors ${
                currentPage === item
                  ? "bg-gold-20 text-dark-blue font-bold"
                  : "text-dark-blue hover:bg-gray-100"
              }`}
            >
              {item}
            </button>
          )
        )}

        {/* Next arrow */}
        <button
          onClick={() => hasNextPage && onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-lg transition-colors ${
            hasNextPage
              ? "text-dark-blue hover:bg-gray-100"
              : "text-gray-300 cursor-not-allowed"
          }`}
          aria-label="Next page"
        >
          &#8594;
        </button>
      </div>
    </div>
  )
}
