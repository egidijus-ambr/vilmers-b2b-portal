"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

type FabricHoverPreviewProps = {
  /** Image loaded only once the preview is shown */
  src: string | undefined
  code: string
  name?: string | null
  children: React.ReactNode
}

const PREVIEW_SIZE = 256
const GAP = 8
const HOVER_DELAY_MS = 150

/**
 * Wraps a small swatch and shows a larger preview (image + code + name) on
 * mouse hover or keyboard focus. The large image is not requested until the
 * preview opens. Touch / pen input never opens it, so a tap just selects.
 * Rendered in a portal with fixed positioning so scroll containers in the
 * drawer do not clip it.
 */
const FabricHoverPreview = ({
  src,
  code,
  name,
  children,
}: FabricHoverPreviewProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPos(null)
  }, [])

  const show = useCallback(() => {
    if (!src || !wrapperRef.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = wrapperRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const height = PREVIEW_SIZE + 44 // image + caption
      const above = r.top - height - GAP
      const top = above >= GAP ? above : r.bottom + GAP
      const left = Math.min(
        Math.max(GAP, r.left + r.width / 2 - PREVIEW_SIZE / 2),
        window.innerWidth - PREVIEW_SIZE - GAP
      )
      setPos({ top, left })
    }, HOVER_DELAY_MS)
  }, [src])

  // The swatch scrolls inside the drawer; a fixed preview would detach.
  useEffect(() => {
    if (!pos) return
    window.addEventListener("scroll", hide, true)
    return () => window.removeEventListener("scroll", hide, true)
  }, [pos, hide])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") show()
      }}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) show()
      }}
      onBlur={hide}
    >
      {children}
      {pos &&
        src &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] bg-configurator-surface border border-gray-200 shadow-lg"
            style={{ top: pos.top, left: pos.left, width: PREVIEW_SIZE }}
          >
            <img
              src={src}
              alt={name ?? code}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              decoding="async"
              className="block w-full aspect-square object-cover bg-gray-50"
            />
            <div className="px-2 py-1.5">
              <p className="text-[10px] text-gray-400 leading-tight truncate">
                {code}
              </p>
              {name && (
                <p className="text-xs text-gray-800 leading-tight truncate">
                  {name}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default FabricHoverPreview
