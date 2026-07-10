"use client"

import { useEffect, useRef, useState } from "react"

interface HeroVideoProps {
  videoSrc: string
  poster?: string | null
}

// Hero video is a progressive enhancement layered on top of the always-present
// background image (which stays the LCP element). The video's own <source> is
// deliberately withheld until after mount (and, ideally, until the browser is
// idle) so it never competes with the image for bandwidth/priority. If the
// user prefers reduced motion, or the video fails to load, this renders
// nothing and the background image underneath remains visible.
type Phase = "pending" | "blocked" | "ready" | "error"

const HeroVideo = ({ videoSrc, poster }: HeroVideoProps) => {
  const [phase, setPhase] = useState<Phase>("pending")
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReducedMotion) {
      setPhase("blocked")
      return
    }

    const load = () => setPhase((current) => (current === "pending" ? "ready" : current))

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(load)
      return () => w.cancelIdleCallback?.(id)
    }

    const timeoutId = window.setTimeout(load, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (phase === "ready") {
      videoRef.current?.play().catch(() => {
        // Autoplay can be rejected by the browser (e.g. no user interaction
        // yet); the muted/autoPlay attributes normally cover this, so a
        // rejected promise here is safe to ignore.
      })
    }
  }, [phase])

  if (phase === "blocked" || phase === "error") {
    return null
  }

  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      loop
      playsInline
      preload="none"
      poster={poster ?? undefined}
      className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-full max-w-[2150px] object-cover"
      onError={() => setPhase("error")}
    >
      {phase === "ready" && <source src={videoSrc} type="video/mp4" />}
    </video>
  )
}

export default HeroVideo
