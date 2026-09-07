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
      // flip.destroy() can throw if teardown races an incomplete init (e.g.
      // a StrictMode replay before loadFromHTML finished) — its internal
      // UI.destroy() dereferences state that may not exist yet. Swallow so
      // the throw can't skip replaceChildren() below or escape into React's
      // commit phase; replaceChildren() is what actually guarantees `host`
      // is empty for the next mount, not destroy()'s own cleanup.
      try {
        flip.destroy()
      } catch {
        // library teardown failure; host.replaceChildren() below still runs
      }
      host.replaceChildren()
      flipRef.current = null
    }
    // Re-keyed on page *content*, not array identity: a client-side
    // navigation/refresh hands down a freshly-mapped `pageUrls` array with
    // identical strings, and rebuilding the book would reset the reader back
    // to page 1 for no visible reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrls.join("|"), pageWidth, pageHeight])

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-3 overflow-hidden bg-neutral-100 py-4">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4">
        <div
          ref={hostRef}
          // page-flip's "stretch" mode only ever derives height FROM width
          // (via a CSS padding-bottom aspect box on an internal wrapper) — it
          // never measures or caps against the row's actual available
          // height. Without the aspect-ratio cap below, `w-full` alone lets
          // the two-page spread render taller than the viewer on common
          // desktop sizes (verified overflowing the row by ~20-60% at
          // 1440x900 / 1920x1080 / 1440x700) since nothing else constrains
          // it vertically. Capping to the landscape (2-page) aspect ratio
          // lets the browser shrink width to fit whichever of max-width
          // (100%, from w-full) or max-height (max-h-full) is tighter,
          // before page-flip ever measures the host.
          //
          // The cap is gated to `sm:` (640px, close to minWidth*2 + the
          // row's px-4 inset = 632px) because applying it unconditionally
          // also regressed narrow/portrait viewports: page-flip's UI sets an
          // inline `min-height: 400px` floor on the book element, which wins
          // over the host's (now short, aspect-capped) max-height, so the
          // book gets pinned taller than the capped box wants and its
          // *width* — computed from that pinned height via the same fixed
          // ratio — shrinks well below the actual available width (verified:
          // ~21% narrower at a 390px-wide viewport). Below `sm`, orientation
          // is portrait anyway (usePortrait) and width, not height, is
          // already the binding/correct constraint, so the cap is skipped.
          className="w-full max-h-full sm:[aspect-ratio:var(--flip-aspect)]"
          style={
            {
              "--flip-aspect": `${pageWidth * 2} / ${pageHeight}`,
            } as React.CSSProperties
          }
        />
      </div>
      {/* `relative z-10` is load-bearing, not cosmetic: page-flip sizes its
          `.stf__wrapper` with a padding-bottom aspect box derived purely from
          the host's WIDTH, so it ignores the host's `max-h-full` and can run
          hundreds of px taller than its own `.stf__parent` (measured: 1492px
          wrapper in a 1149px host at 2142x1235, overflowing to y=1508 — right
          across this bar at y=1177-1219). `.stf__parent` is `position:
          relative`, so that overflow paints in a later stacking layer than
          this static row and swallows every click on the arrows — the buttons
          look fine and simply never fire. Promoting this bar into its own
          positioned layer keeps it above the spill in every geometry,
          including short viewports where page-flip's inline
          `min-height: 400px` floor on `.stf__parent` makes the overflow
          unavoidable by sizing alone. */}
      <div className="relative z-10 flex items-center gap-4">
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
