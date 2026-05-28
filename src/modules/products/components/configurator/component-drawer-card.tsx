"use client"

import React from "react"
import { createPortal } from "react-dom"
import { clx } from "@medusajs/ui"

type ComponentDrawerCardProps = {
  component: {
    id: number
    code: string
    image: { src: string; src_md: string | null; src_xs: string | null } | null
    color?: { hex: string; background: string | null } | null
    is_wrapper?: boolean
    linked_components_source?:
      | {
          id: number
          link_type: string
          target_component: {
            id: number
            code: string | null
            image: { src_thumbnail?: string; src_md: string | null } | null
            additional_component_profiles: {
              name: string
              description?: string | null
              language: string
            }[]
          }
        }[]
      | null
  }
  name: string
  description?: string | null
  isSelected: boolean
  onClick: () => void
  zoomEnabled?: boolean
  tall?: boolean
  languageCode?: string
}

const ZOOM_W = 320
const ZOOM_H = 320
const GAP = 8

const ComponentDrawerCard = ({
  component,
  name,
  description,
  isSelected,
  onClick,
  zoomEnabled = false,
  tall = false,
  languageCode,
}: ComponentDrawerCardProps) => {
  const imageHeightClass = tall ? "h-44" : "h-32"
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [zoomVisible, setZoomVisible] = React.useState(false)
  const [zoomPos, setZoomPos] = React.useState<{
    left: number
    top: number
  } | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const imageSrc =
    component.image?.src_md ?? component.image?.src_xs ?? component.image?.src

  // Check for wrapper with INCLUDES linked components
  const includedLinks = (component.linked_components_source ?? []).filter(
    (link) => link.link_type === "INCLUDES"
  )
  const isWrapper = component.is_wrapper && includedLinks.length > 0

  const showZoom = () => {
    if (!zoomEnabled || !imageSrc || isWrapper) return
    const node = buttonRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()

    let left = rect.right + GAP
    let top = rect.top

    if (left + ZOOM_W > window.innerWidth - 8) {
      left = rect.left - ZOOM_W - GAP
    }
    if (left < 8) {
      left = 8
    }
    top = Math.max(8, Math.min(top, window.innerHeight - ZOOM_H - 8))

    setZoomPos({ left, top })
    setZoomVisible(true)
  }

  const hideZoom = () => {
    setZoomVisible(false)
  }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={showZoom}
      onMouseLeave={hideZoom}
      onFocus={showZoom}
      onBlur={hideZoom}
      className={clx(
        "relative w-full text-left overflow-hidden border transition-all focus:outline-none",
        {
          "ring-2 ring-[#1e2a3a] border-[#1e2a3a]": isSelected,
          "hover:ring-1 hover:ring-gray-300 border-gray-200": !isSelected,
        }
      )}
    >
      {/* Image area */}
      {isWrapper ? (
        /* Wrapper: show linked component images side by side */
        tall ? (
          <div
            className={clx(
              "w-full flex flex-row items-start gap-3 overflow-x-auto p-3",
              imageHeightClass
            )}
          >
            {includedLinks.map((link) => {
              const target = link.target_component
              const targetSrc =
                target?.image?.src_thumbnail ?? target?.image?.src_md
              const targetProfile =
                target?.additional_component_profiles?.find(
                  (p) => p.language === languageCode
                ) ?? target?.additional_component_profiles?.[0]
              const targetName =
                targetProfile?.name ??
                target?.code ??
                `Component ${target?.id ?? ""}`
              const targetDescription = targetProfile?.description ?? null
              return (
                <div key={link.id} className="flex items-start gap-2 shrink-0">
                  {targetSrc ? (
                    <div className="w-36 h-32 bg-[#F2F0EF] flex items-center justify-center shrink-0">
                      <img
                        src={targetSrc}
                        alt={target?.code ?? ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-32 bg-[#F2F0EF]  flex items-center justify-center shrink-0" />
                  )}
                  <div className="flex flex-col w-40 shrink-0">
                    <p className="font-semibold text-sm truncate">
                      {targetName}
                    </p>
                    {targetDescription && (
                      <p className="text-xs text-gray-500 leading-snug whitespace-pre-line line-clamp-3">
                        {targetDescription}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            className={clx(
              "w-full overflow-hidden bg-[#F2F0EF] flex items-center justify-center gap-1 p-2",
              imageHeightClass
            )}
          >
            {includedLinks.map((link) => {
              const target = link.target_component
              const targetSrc =
                target?.image?.src_thumbnail ?? target?.image?.src_md
              return targetSrc ? (
                <img
                  key={link.id}
                  src={targetSrc}
                  alt={target?.code ?? ""}
                  className="h-full w-[48%] object-cover"
                  loading="lazy"
                />
              ) : null
            })}
          </div>
        )
      ) : imageSrc ? (
        <div
          className={clx(
            "w-full overflow-hidden bg-[#F2F0EF]",
            imageHeightClass
          )}
        >
          <img
            src={imageSrc}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : component.color?.hex ? (
        /* Color swatch fallback */
        <div
          className={clx("w-full overflow-hidden", imageHeightClass)}
          style={{ backgroundColor: component.color.hex }}
        />
      ) : (
        <div
          className={clx(
            "w-full overflow-hidden bg-[#F2F0EF] flex items-center justify-center",
            imageHeightClass
          )}
        >
          <span className="text-xs text-gray-400">{component.code}</span>
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#1e2a3a] rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Label */}
      {!(isWrapper && tall) && (
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-gray-800 leading-tight truncate">
            {name}
          </p>
          {description && (
            <p className="text-[10px] text-gray-400 leading-tight truncate mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}

      {mounted &&
        zoomVisible &&
        zoomPos &&
        imageSrc &&
        createPortal(
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: "fixed",
              left: zoomPos.left,
              top: zoomPos.top,
              width: ZOOM_W,
              height: ZOOM_H,
              zIndex: 100,
              pointerEvents: "none",
            }}
            className="rounded-md shadow-2xl border border-zinc-200 bg-white object-cover"
          />,
          document.body
        )}
    </button>
  )
}

export default ComponentDrawerCard
