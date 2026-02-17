"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import TablePagination from "@modules/common/components/table-pagination"

interface ProductPaginationProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  itemLabel?: string
}

export default function ProductPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  itemLabel = "products",
}: ProductPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <TablePagination
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      itemLabel={itemLabel}
    />
  )
}
