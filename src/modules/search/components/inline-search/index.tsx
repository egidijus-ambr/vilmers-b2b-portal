"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n/provider"
import { quickSearchProducts } from "@lib/data/search-products"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import B2BProductCard from "@modules/categories/components/category-product-card"

interface InlineSearchProps {
  /** Header is currently transparent-over-hero: use light foreground. */
  isTransparent?: boolean
  className?: string
}

/**
 * Always-visible header search input (theme `layout.searchButton.variant ===
 * "inline"`). Same behaviour as `SearchModal`: 400ms debounce, >= 3 chars,
 * `quickSearchProducts` suggestions, Enter -> `/<lang>/search/<query>`.
 * Only the presentation differs (inline input + dropdown panel).
 */
export default function InlineSearch({
  isTransparent = false,
  className = "",
}: InlineSearchProps) {
  const router = useRouter()
  const { languageCode } = useParams() as { languageCode: string }
  const { t, language } = useTranslations()

  const [inputValue, setInputValue] = useState("")
  const [debouncedValue, setDebouncedValue] = useState("")
  const [results, setResults] = useState<ProductContainer[]>([])
  const [productsCount, setProductsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), 400)
    return () => clearTimeout(timer)
  }, [inputValue])

  useEffect(() => {
    if (debouncedValue.length < 3) {
      setResults([])
      setProductsCount(0)
      return
    }

    let cancelled = false
    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const response = await quickSearchProducts(debouncedValue, language)
        if (!cancelled) {
          setResults(response.products)
          setProductsCount(response.totalCount)
        }
      } catch (error) {
        console.error("Search failed:", error)
        if (!cancelled) {
          setResults([])
          setProductsCount(0)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchResults()

    return () => {
      cancelled = true
    }
  }, [debouncedValue, language])

  const close = useCallback(() => setIsPanelOpen(false), [])

  const clear = useCallback(() => {
    setInputValue("")
    setDebouncedValue("")
    setResults([])
    setProductsCount(0)
    setIsLoading(false)
    setIsPanelOpen(false)
  }, [])

  // Close the suggestions panel on outside click / Escape.
  useEffect(() => {
    if (!isPanelOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsPanelOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPanelOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isPanelOpen])

  const navigateToSearch = useCallback(() => {
    if (inputValue.length >= 3) {
      router.push(`/${languageCode}/search/${encodeURIComponent(inputValue)}`)
      clear()
    }
  }, [inputValue, languageCode, router, clear])

  const fg = isTransparent
    ? "text-white placeholder-white/70 border-white/60"
    : "text-nav-foreground placeholder-nav-foreground/60 border-nav-foreground/25 focus-within:border-nav-foreground/60"

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-x-2 h-10 px-3 border rounded-input transition-colors ${fg}`}
      >
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsPanelOpen(true)
          }}
          onFocus={() => setIsPanelOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigateToSearch()
          }}
          placeholder={t("search-placeholder")}
          aria-label={t("search-placeholder")}
          data-testid="nav-search-input"
          className={`flex-1 min-w-0 text-sm border-none outline-none bg-transparent text-inherit ${isTransparent ? "placeholder:text-inherit" : "placeholder:text-nav-foreground/40"} focus:ring-0 p-0`}
        />
      </div>

      {isPanelOpen && inputValue.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-[min(720px,90vw)] bg-white text-dark-blue shadow-lg border border-gray-200 max-h-[70vh] overflow-y-auto z-50">
          {debouncedValue.length >= 3 ? (
            <div className="p-6">
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : results.length > 0 ? (
                <div>
                  <p className="mb-4 text-sm font-medium text-gray-700">
                    {t("search-products-count")}: {productsCount}
                  </p>
                  <ul
                    className="grid grid-cols-2 gap-x-4 gap-y-6"
                    onClick={clear}
                  >
                    {results.map((product) => (
                      <B2BProductCard
                        key={product.id}
                        container={product}
                        language={language}
                      />
                    ))}
                  </ul>
                  {productsCount > 4 && (
                    <button
                      onClick={navigateToSearch}
                      className="mt-6 text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600 transition-colors"
                    >
                      {t("search-explore-more")} &rarr;
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-xl text-dark-blue mb-1">
                    {t("search-no-results-title")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t("search-no-results-hint")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="px-6 py-4 text-sm text-gray-500">
              {t("search-min-chars")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
