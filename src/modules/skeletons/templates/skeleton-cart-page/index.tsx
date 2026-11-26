"use client"

import { useTranslations } from "@lib/i18n"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"

// Placeholder blocks use the themed `grey-10` token (not Tailwind's `gray-*`)
// so they follow the active brand; the white card surfaces match the real
// cart cards (`bg-white`).
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-grey-10 rounded ${className}`} />
)

/**
 * Mirrors one `CartItemCard` (src/modules/cart/templates/items.tsx): mobile
 * 120px image + text, qty/price row and actions row; desktop 280px image
 * column, details with the h-10 quantity control + price, border-t actions.
 */
export const SkeletonCartItemCard = () => (
  <div className="bg-white animate-pulse" aria-hidden="true">
    {/* Mobile */}
    <div className="small:hidden p-4">
      <div className="flex gap-x-4">
        <Bar className="w-[120px] h-[120px] flex-shrink-0" />
        <div className="flex flex-col gap-y-2 min-w-0 flex-1">
          <Bar className="h-5 w-3/4" />
          <Bar className="h-4 w-1/2" />
          <Bar className="h-4 w-1/3" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <Bar className="w-[120px] h-10" />
        <Bar className="w-24 h-6" />
      </div>
      <div className="flex border-t border-gray-200 mt-4 py-3">
        <Bar className="h-5 flex-1 mr-4" />
        <Bar className="h-5 w-6" />
      </div>
    </div>

    {/* Desktop */}
    <div className="hidden small:flex">
      <div className="w-[280px] flex-shrink-0 p-6">
        <Bar className="w-full h-[200px]" />
      </div>
      <div className="flex-1 flex flex-col border-l border-gray-200">
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-y-2">
            <Bar className="h-6 w-1/2" />
            <Bar className="h-4 w-1/3" />
            <Bar className="h-4 w-1/4" />
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <Bar className="h-4 w-16 mb-2" />
              <Bar className="w-[120px] h-10" />
            </div>
            <Bar className="w-28 h-7" />
          </div>
        </div>
        <div className="flex border-t border-gray-200">
          <div className="flex-1 flex items-center justify-center py-3 border-r border-gray-200">
            <Bar className="h-5 w-40" />
          </div>
          <div className="flex-1 flex items-center justify-center py-3">
            <Bar className="h-5 w-24" />
          </div>
        </div>
      </div>
    </div>
  </div>
)

/** Mirrors `CartSummary`: title, item mini-rows, totals and the 3 buttons. */
export const SkeletonCartSummary = ({ rows = 2 }: { rows?: number }) => (
  <div className="bg-white pb-6 p-4 md:p-6 animate-pulse" aria-hidden="true">
    <Bar className="h-5 w-32 mb-6" />
    <div className="flex flex-col gap-y-6 mb-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-x-4">
          <Bar className="w-[120px] h-[120px] flex-shrink-0" />
          <div className="flex flex-col gap-y-2 flex-1 min-w-0">
            <Bar className="h-5 w-3/4" />
            <Bar className="h-4 w-1/3" />
            <Bar className="h-5 w-1/2 mt-3" />
          </div>
        </div>
      ))}
    </div>
    <div className="pt-4">
      <div className="flex justify-between items-center">
        <Bar className="h-5 w-24" />
        <Bar className="h-5 w-20" />
      </div>
      <div className="border-t border-gray-200 my-3" />
      <div className="flex justify-between items-center">
        <Bar className="h-6 w-16" />
        <Bar className="h-7 w-28" />
      </div>
    </div>
    <div className="mt-6 flex flex-col gap-y-3">
      <Bar className="h-[46px] w-full" />
      <Bar className="h-[46px] w-full" />
      <Bar className="h-[46px] w-full" />
    </div>
  </div>
)

/**
 * The cart page content area while the cart is first fetched (or refetched
 * for a newly selected acting customer). Same grid as `CartTemplate`.
 */
export const SkeletonCartContent = ({ rows = 2 }: { rows?: number }) => {
  const { t } = useTranslations("common")
  return (
    <div
      className="pb-12"
      data-testid="cart-skeleton"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{t("loading")}</span>
      <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
        <div className="small:col-span-2 flex flex-col gap-y-6">
          <div className="flex flex-col gap-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonCartItemCard key={i} />
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="flex flex-col gap-y-8 sticky top-[120px]">
            <SkeletonCartSummary rows={rows} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Route-level skeleton (`cart/loading.tsx`): real header + content skeleton. */
const SkeletonCartPage = () => {
  const { t } = useTranslations("account")
  return (
    <>
      <PageHeader
        title={t("cart-details")}
        breadcrumbItems={[
          { label: t("breadcrumb-home"), href: "/" },
          { label: t("breadcrumb-cart"), href: null },
        ]}
        level="h2"
      />
      <PageContent>
        <SkeletonCartContent />
      </PageContent>
    </>
  )
}

export default SkeletonCartPage
