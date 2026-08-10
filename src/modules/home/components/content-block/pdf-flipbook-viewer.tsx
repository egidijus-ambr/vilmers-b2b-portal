"use client"

import { useEffect, useRef, useState } from "react"
import { PageFlip } from "page-flip"
import ArrowLeft from "@modules/common/icons/arrow-left"
import ArrowRight from "@modules/common/icons/arrow-right"

interface PdfFlipbookViewerProps {
  pageUrls: string[]
  pageWidth: number
  pageHeight: number
  /** Original PDF url; null hides the download button. */
  pdfUrl: string | null
}

export default function PdfFlipbookViewer({
  pageUrls,
  pageWidth,
  pageHeight,
  pdfUrl,
}: PdfFlipbookViewerProps) {
  // `hostRef` stays empty in JSX — React never renders children into it, and
  // never touches its subtree on re-render. PageFlip.destroy() calls
  // `this.block.remove()` on the element it was constructed with, and its
  // HTML-mode UI reparents the `.flipbook-page` nodes into nested wrapper
  // divs it injects. Handing PageFlip a React-managed node (and JSX-rendered
  // children) means destroy() rips a node out of the DOM that React still
  // thinks it owns — in dev, React StrictMode's mount→cleanup→mount replay
  // then re-initializes PageFlip onto a detached, invisible node (blank
  // viewer), and any React re-render of the page list could try to move
  // nodes PageFlip already relocated. Building the book element and its
  // pages imperatively, outside React's tree, avoids both failure modes.
  const hostRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<PageFlip | null>(null)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const bookEl = document.createElement("div")
    bookEl.className = "max-h-full"
    for (let i = 0; i < pageUrls.length; i++) {
      const pageEl = document.createElement("div")
      pageEl.className = "flipbook-page"
      const img = document.createElement("img")
      img.src = pageUrls[i]
      img.alt = `Page ${i + 1}`
      img.loading = "lazy"
      img.draggable = false
      img.width = pageWidth
      img.height = pageHeight
      pageEl.appendChild(img)
      bookEl.appendChild(pageEl)
    }
    host.appendChild(bookEl)

    const flip = new PageFlip(bookEl, {
      width: pageWidth,
      height: pageHeight,
      size: "stretch",
      minWidth: 300,
      maxWidth: 2000,
      minHeight: 400,
      maxHeight: 2600,
      showCover: true,
      usePortrait: true, // single-page mode on narrow/mobile viewports
      mobileScrollSupport: false,
      maxShadowOpacity: 0.4,
    })
    // HTML mode (not loadFromImages) so the browser's native loading="lazy"
    // defers offscreen pages — visitors fetch spreads, not the whole catalog.
    flip.loadFromHTML(bookEl.querySelectorAll(".flipbook-page"))
    flip.on("flip", (e) => setCurrent(e.data as number))
    flipRef.current = flip

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") flip.flipNext()
      if (e.key === "ArrowLeft") flip.flipPrev()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      flip.destroy()
      // Defensive: destroy() already removes bookEl from `host`, this just
      // guards against any nodes it leaves behind.
      host.replaceChildren()
      flipRef.current = null
    }
  }, [pageUrls, pageWidth, pageHeight])

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-3 overflow-hidden bg-neutral-100 py-4">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4">
        <div ref={hostRef} className="max-h-full" />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => flipRef.current?.flipPrev()}
          className="rounded-full border bg-white p-2 hover:bg-neutral-50"
        >
          <ArrowLeft />
        </button>
        <span className="text-sm text-neutral-600">
          {current + 1} / {pageUrls.length}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => flipRef.current?.flipNext()}
          className="rounded-full border bg-white p-2 hover:bg-neutral-50"
        >
          <ArrowRight />
        </button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-neutral-600 underline hover:text-neutral-900"
          >
            Download PDF
          </a>
        )}
      </div>
    </div>
  )
}
