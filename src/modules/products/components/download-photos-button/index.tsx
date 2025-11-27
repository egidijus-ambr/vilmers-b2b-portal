"use client"

import { useState } from "react"

type DownloadPhotosButtonProps = {
  productName: string
  photoCount: number
  disabled?: boolean
}

const DownloadPhotosButton = ({
  productName,
  photoCount,
  disabled = false,
}: DownloadPhotosButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (disabled || isDownloading) return

    try {
      setIsDownloading(true)
      setError(null)

      const encodedProductName = encodeURIComponent(productName)
      const response = await fetch(
        `/api/download-photos/${encodedProductName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to download photos")
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      // Get filename from response headers or create default
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `${productName.replace(/[^a-zA-Z0-9-_]/g, "_")}_photos.zip`

      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed:", err)
      setError(err instanceof Error ? err.message : "Download failed")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleDownload}
        disabled={disabled || isDownloading || photoCount === 0}
        title={`Download all photos (${photoCount})`}
        className={`
          flex items-center justify-center transition-colors
          ${
            disabled || isDownloading || photoCount === 0
              ? "text-ui-fg-disabled cursor-not-allowed"
              : "text-ui-fg-base hover:text-ui-fg-subtle"
          }
        `}
      >
        {isDownloading ? (
          <div className="w-5 h-5 border-2 border-ui-fg-muted border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
            stroke-linecap="round"
            stroke-linejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M12 4.5v11m3.5-3.5L12 15.5 8.5 12" />
          </svg>
        )}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2">
          {error}
        </div>
      )}
    </div>
  )
}

export default DownloadPhotosButton
