"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useCatalogBuilder } from "@lib/context/catalog-builder-context"
import { getCatalogueLanguage } from "@lib/util/catalogue-language"
import { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"

interface PdfCatalogueButtonProps {
  productName: string
}

async function downloadCatalogue(catalogue: CatalogueFile): Promise<void> {
  const response = await fetch(catalogue.url)
  if (!response.ok) {
    throw new Error(`Failed to download catalogue: ${response.statusText}`)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = catalogue.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

export default function PdfCatalogueButton({
  productName,
}: PdfCatalogueButtonProps) {
  const context = useCatalogBuilder()
  const catalogueMap = context?.catalogueMap ?? {}
  const params = useParams()
  const languageCode = (params?.languageCode as string) ?? "en"

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const catalogueLanguage = getCatalogueLanguage(languageCode)

  const allCatalogues = catalogueMap[productName] ?? []
  const languageMatches = allCatalogues.filter(
    (c) => c.language === catalogueLanguage
  )
  const matchedCatalogues =
    languageMatches.length > 0
      ? languageMatches
      : allCatalogues.filter((c) => c.language === "EN")

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

  const handleSingleDownload = async (
    e: React.MouseEvent,
    catalogue: CatalogueFile
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDownloading) return
    try {
      setIsDownloading(true)
      await downloadCatalogue(catalogue)
    } catch (err) {
      console.error("PDF catalogue download failed:", err)
    } finally {
      setIsDownloading(false)
    }
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
        className="flex items-center justify-center w-8 h-8 transition-opacity opacity-80 hover:opacity-100"
      >
        {isDownloading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Image
            src="/images/svg/pdf.svg"
            alt="PDF"
            width={24}
            height={24}
          />
        )}
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
              {catalogue.unitsLabel
                ? `${catalogue.unitsLabel} (${catalogue.units})`
                : catalogue.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
