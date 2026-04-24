"use client"

import { useState, useRef, useEffect } from "react"
import { useCatalogBuilder } from "@lib/context/catalog-builder-context"
import { useCustomer } from "@lib/context/customer-context"
import { getCustomerMarket } from "@lib/util/customer-market"
import { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"
import { CatalogDownloadIcon } from "@modules/common/icons/catalog-download"

interface PdfCatalogueButtonProps {
  productName: string
}

function downloadCatalogue(catalogue: CatalogueFile): void {
  const link = document.createElement("a")
  link.href = catalogue.url
  link.download = catalogue.filename
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function PdfCatalogueButton({
  productName,
}: PdfCatalogueButtonProps) {
  const context = useCatalogBuilder()
  const catalogueMap = context?.catalogueMap ?? {}
  const { customer } = useCustomer()
  const customerMarket = getCustomerMarket(customer)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const allCatalogues = catalogueMap[productName] ?? []
  const marketMatches = customerMarket
    ? allCatalogues.filter((c) => c.market === customerMarket)
    : []
  const matchedCatalogues =
    marketMatches.length > 0 ? marketMatches : allCatalogues

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownOpen])

  if (matchedCatalogues.length === 0) {
    return null
  }

  const handleSingleDownload = (
    e: React.MouseEvent,
    catalogue: CatalogueFile
  ) => {
    e.preventDefault()
    e.stopPropagation()
    downloadCatalogue(catalogue)
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (matchedCatalogues.length === 1) {
      handleSingleDownload(e, matchedCatalogues[0])
    } else {
      setDropdownOpen((prev) => !prev)
    }
  }

  const handleDropdownOptionClick = (
    e: React.MouseEvent,
    catalogue: CatalogueFile
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDropdownOpen(false)
    handleSingleDownload(e, catalogue)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleButtonClick}
        title="Download PDF catalogue"
        aria-label="Download PDF catalogue"
        className="flex items-center justify-center w-8 h-8 text-gold transition-opacity opacity-80 hover:opacity-100"
      >
        <CatalogDownloadIcon className="w-6 h-6" />
      </button>

      {dropdownOpen && matchedCatalogues.length > 1 && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-max rounded bg-white shadow-lg border border-gray-200 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {matchedCatalogues.map((catalogue, index) => (
            <button
              key={index}
              onClick={(e) => handleDropdownOptionClick(e, catalogue)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              {catalogue.market ?? catalogue.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
