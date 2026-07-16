"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import type { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import type { SupportedLanguage } from "@lib/i18n"
import B2BProductCard from "@modules/categories/components/category-product-card"
import ArrowLeft from "@modules/common/icons/arrow-left"
import ArrowRight from "@modules/common/icons/arrow-right"

interface ProductCarouselGridProps {
  products: ProductContainer[]
  language: SupportedLanguage
  maxRows?: number
  title?: string
  titleClassName?: string
  cardClassName?: string
  imageBackgroundClass?: string
}

export default function ProductCarouselGrid({
  products,
  language,
  maxRows,
  title,
  titleClassName,
  cardClassName,
  imageBackgroundClass,
}: ProductCarouselGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const scrollable = container.scrollWidth > container.clientWidth + 1
    setHasOverflow(scrollable)
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 1
    )
  }, [])

  useEffect(() => {
    if (!maxRows) return

    const container = scrollRef.current
    if (!container) return

    updateScrollButtons()

    container.addEventListener("scroll", updateScrollButtons, { passive: true })
    window.addEventListener("resize", updateScrollButtons)

    return () => {
      container.removeEventListener("scroll", updateScrollButtons)
      window.removeEventListener("resize", updateScrollButtons)
    }
  }, [maxRows, updateScrollButtons])

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.6
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (products.length === 0) return null

  if (!maxRows) {
    return (
      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((product) => (
          <B2BProductCard key={product.id} container={product} language={language} cardClassName={cardClassName} imageBackgroundClass={imageBackgroundClass} />
        ))}
      </ul>
    )
  }

  return (
    <div>
      {(title || hasOverflow) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h4 className={titleClassName ?? "!mb-0"}>{title}</h4>}
          {hasOverflow && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`p-2 transition-opacity ${
                  canScrollLeft
                    ? "opacity-100 hover:opacity-70"
                    : "opacity-30 cursor-default"
                }`}
                aria-label="Scroll left"
              >
                <ArrowLeft
                  size="20"
                  color={canScrollLeft ? "dark-blue" : "dark-blue-70"}
                />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`p-2 transition-opacity ${
                  canScrollRight
                    ? "opacity-100 hover:opacity-70"
                    : "opacity-30 cursor-default"
                }`}
                aria-label="Scroll right"
              >
                <ArrowRight
                  size="20"
                  color={canScrollRight ? "dark-blue" : "dark-blue-70"}
                />
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory"
      >
        {products.map((product) => (
          <ul
            key={product.id}
            className="shrink-0 snap-start w-[calc(50%-12px)] small:w-[calc(33.333%-16px)] medium:w-[calc(25%-18px)]"
          >
            <B2BProductCard container={product} language={language} cardClassName={cardClassName} imageBackgroundClass={imageBackgroundClass} />
          </ul>
        ))}
      </div>
    </div>
  )
}
