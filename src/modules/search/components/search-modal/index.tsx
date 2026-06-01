"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "@lib/i18n/provider"
import { quickSearchProducts } from "@lib/data/search-products"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import B2BProductCard from "@modules/categories/components/category-product-card"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const { languageCode } = useParams() as { languageCode: string }
  const { t, language } = useTranslations()

  const [inputValue, setInputValue] = useState("")
  const [debouncedValue, setDebouncedValue] = useState("")
  const [results, setResults] = useState<ProductContainer[]>([])
  const [productsCount, setProductsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue)
    }, 400)

    return () => clearTimeout(timer)
  }, [inputValue])

  // Fetch search results when debounced value changes
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
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()

    return () => {
      cancelled = true
    }
  }, [debouncedValue, language])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setInputValue("")
      setDebouncedValue("")
      setResults([])
      setProductsCount(0)
      setIsLoading(false)
    }
  }, [isOpen])

  // Auto-focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  const navigateToSearch = useCallback(() => {
    if (inputValue.length >= 3) {
      router.push(`/${languageCode}/search/${encodeURIComponent(inputValue)}`)
      onClose()
    }
  }, [inputValue, languageCode, router, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        navigateToSearch()
      }
    },
    [navigateToSearch]
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - semi-transparent overlay behind the dropdown, clicking closes search */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Search panel - positioned over the nav header area */}
      {/* Uses absolute positioning with top-[32px] to align with the header element */}
      {/* The TopBar is 36px tall, so the header (72px) starts at top-[32px] */}
      {/* This positions the search panel to start exactly where the header begins */}
      <div className="absolute inset-x-0 top-0 small:top-[32px] z-50 bg-white shadow-lg">
        {/* Search input bar - same height as the nav header (72px) */}
        <div className="h-[72px] max-w-[1440px] mx-auto flex items-center px-6 gap-4 border-b border-gray-200">
          {/* Search icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-dark-blue shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("search-placeholder")}
            className="flex-1 text-[16px] border-none outline-none bg-transparent text-dark-blue placeholder-gray-400 focus:ring-0"
            autoFocus
          />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 p-2 text-dark-blue hover:text-dark-blue/70 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Results dropdown - only appears when user has typed 3+ chars */}
        {debouncedValue.length >= 3 && (
          <div className="max-w-[1400px] mx-auto px-6 py-10 border-t border-gray-100 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Loading...</span>
              </div>
            ) : results.length > 0 ? (
              <div>
                <p className="mb-4 text-sm font-medium text-gray-700">
                  {t("search-products-count")}: {productsCount}
                </p>

                <ul
                  className="grid grid-cols-2 small:grid-cols-4 gap-x-6 gap-y-8"
                  onClick={onClose}
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
                  <div className="mt-8">
                    <button
                      onClick={navigateToSearch}
                      className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600 transition-colors"
                    >
                      {t("search-explore-more")} &rarr;
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4">
                <h3 className="text-2xl text-dark-blue mb-2">
                  {t("search-no-results-title")}
                </h3>
                <p className="text-gray-500">{t("search-no-results-hint")}</p>
              </div>
            )}
          </div>
        )}

        {/* Hint for minimum characters */}
        {inputValue.length > 0 &&
          inputValue.length < 3 &&
          debouncedValue.length < 3 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">{t("search-min-chars")}</p>
            </div>
          )}
      </div>
    </>
  )
}
