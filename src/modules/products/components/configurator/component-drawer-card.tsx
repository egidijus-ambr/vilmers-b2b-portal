"use client"

import React from "react"
import { clx } from "@medusajs/ui"

type ComponentDrawerCardProps = {
  component: {
    id: number
    code: string
    image: { src: string; src_md: string | null; src_xs: string | null } | null
    color?: { hex: string; background: string | null } | null
    is_wrapper?: boolean
    linked_components_source?: {
      id: number
      link_type: string
      target_component: {
        id: number
        code: string | null
        image: { src_thumbnail?: string; src_md: string | null } | null
        additional_component_profiles: { name: string; language: string }[]
      }
    }[] | null
  }
  name: string
  description?: string | null
  isSelected: boolean
  onClick: () => void
}

const ComponentDrawerCard = ({ component, name, description, isSelected, onClick }: ComponentDrawerCardProps) => {
  const imageSrc = component.image?.src_md ?? component.image?.src_xs ?? component.image?.src

  // Check for wrapper with INCLUDES linked components
  const includedLinks = (component.linked_components_source ?? []).filter(
    (link) => link.link_type === "INCLUDES"
  )
  const isWrapper = component.is_wrapper && includedLinks.length > 0

  return (
    <button
      onClick={onClick}
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
        <div className="w-full h-32 bg-gray-50 flex items-center justify-center gap-1 p-2">
          {includedLinks.map((link) => {
            const target = link.target_component
            const targetSrc = target?.image?.src_thumbnail ?? target?.image?.src_md
            return targetSrc ? (
              <img
                key={link.id}
                src={targetSrc}
                alt={target?.code ?? ""}
                className="h-full max-w-[48%] object-contain"
                loading="lazy"
              />
            ) : null
          })}
        </div>
      ) : imageSrc ? (
        <div className="w-full h-32 bg-gray-50">
          <img
            src={imageSrc}
            alt={name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
      ) : component.color?.hex ? (
        /* Color swatch fallback */
        <div
          className="w-full h-32"
          style={{ backgroundColor: component.color.hex }}
        />
      ) : (
        <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400">{component.code}</span>
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#1e2a3a] rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Label */}
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium text-gray-800 leading-tight truncate">{name}</p>
        {description && (
          <p className="text-[10px] text-gray-400 leading-tight truncate mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}

export default ComponentDrawerCard
