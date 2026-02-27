"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { CategoryData } from "@lib/furnisystems-sdk/modules/categories/types"
import ArrowLeft from "@modules/common/icons/arrow-left"
import ArrowRight from "@modules/common/icons/arrow-right"

interface ChildCategoriesCarouselProps {
  categories: CategoryData[]
  language: string
  languageCode: string
}

export default function ChildCategoriesCarousel({
  categories,
  language,
  languageCode,
}: ChildCategoriesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const visibleCategories = useMemo(
    () =>
      categories
        .filter((cat) => cat.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0)),
    [categories]
  )

  const updateScrollButtons = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 1
    )
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    updateScrollButtons()

    container.addEventListener("scroll", updateScrollButtons, { passive: true })
    window.addEventListener("resize", updateScrollButtons)

    return () => {
      container.removeEventListener("scroll", updateScrollButtons)
      window.removeEventListener("resize", updateScrollButtons)
    }
  }, [updateScrollButtons])

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.6
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (visibleCategories.length === 0) return null

  return (
    <div className="content-container px-6 large:px-0 ">
      <div className="mx-auto max-w-screen-2xl">
        {/* Navigation Arrows - Top Right */}
        <div className="mb-4 flex justify-end gap-2">
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

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="no-scrollbar flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-2 md:gap-8 md:px-4"
        >
          {visibleCategories.map((category) => {
            const profile = category.category_profiles?.find(
              (p) => p.language === language
            )
            const name = profile?.name ?? ""
            const permalink = profile?.meta_information?.permalink
            const imageSrc = category.image_icon?.src || category.image?.src

            if (!permalink) return null

            return (
              <Link
                key={category.id}
                href={`/${languageCode}/categories/${permalink}`}
                className="flex shrink-0 snap-start flex-col items-center gap-3 transition-opacity hover:opacity-80"
              >
                <div className="flex h-[100px] w-[100px] md:h-[162px] md:w-[162px] items-center justify-center overflow-hidden rounded-full bg-gold-20">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={name}
                      width={120}
                      height={120}
                      className="h-[72px] w-[72px] md:h-[120px] md:w-[120px] object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
                      <span className="text-2xl">{name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <span className="max-w-[100px] md:max-w-[162px] text-center text-xs md:text-sm leading-tight text-dark-blue">
                  {name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
