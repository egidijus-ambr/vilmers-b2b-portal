"use client"

import { VideoPlayerProps } from "./types"

function getYouTubeVideoId(link: string): string | null {
  const regex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})(?:\S+)?$/
  const match = link.match(regex)
  return match?.[1] ?? null
}

function getVimeoVideoId(link: string): string | null {
  const regex = /(?:vimeo\.com\/)(\d+)/
  const match = link.match(regex)
  return match?.[1] ?? null
}

export default function VideoPlayer({
  videoType,
  videoLink,
  videoAutoplay,
  videoLoop,
  videoControls,
  objectFitCover,
}: VideoPlayerProps) {
  if (!videoType || !videoLink) return null

  if (videoType === "uploaded") {
    return (
      <video
        className={
          objectFitCover
            ? "absolute inset-0 h-full w-full object-cover"
            : "max-h-full max-w-full"
        }
        src={videoLink}
        loop={videoLoop ?? false}
        autoPlay={videoAutoplay ?? false}
        controls={videoControls ?? true}
        muted
        preload="auto"
        playsInline
      />
    )
  }

  if (videoType === "youtube") {
    const videoId = getYouTubeVideoId(videoLink)
    if (!videoId) return null

    const params = new URLSearchParams({
      autoplay: videoAutoplay ? "1" : "0",
      loop: videoLoop ? "1" : "0",
      mute: videoAutoplay ? "1" : "0",
      ...(videoLoop ? { playlist: videoId } : {}),
    })

    return (
      <iframe
        className="aspect-video w-full"
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    )
  }

  if (videoType === "vimeo") {
    const videoId = getVimeoVideoId(videoLink)
    if (!videoId) return null

    const params = new URLSearchParams({
      autoplay: videoAutoplay ? "1" : "0",
      loop: videoLoop ? "1" : "0",
      muted: videoAutoplay ? "1" : "0",
    })

    return (
      <iframe
        className="aspect-video w-full"
        src={`https://player.vimeo.com/video/${videoId}?${params.toString()}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title="Vimeo video"
      />
    )
  }

  return null
}
