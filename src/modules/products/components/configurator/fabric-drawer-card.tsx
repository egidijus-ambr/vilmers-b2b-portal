"use client"

import React from "react"
import { clx } from "@medusajs/ui"

type FabricDrawerCardProps = {
  fabric: {
    id: number
    code: string
    color_name: string | null
    image: { src: string; src_md: string | null; src_xs: string | null } | null
  }
  isSelected: boolean
  onClick: () => void
}

const FabricDrawerCard = ({ fabric, isSelected, onClick }: FabricDrawerCardProps) => {
  const imageSrc = fabric.image?.src_md ?? fabric.image?.src_xs ?? fabric.image?.src

  return (
    <button
      onClick={onClick}
      className={clx(
        "relative w-full text-left overflow-hidden transition-all focus:outline-none",
        {
          "ring-2 ring-configurator-accent": isSelected,
          "hover:ring-1 hover:ring-gray-300": !isSelected,
        }
      )}
    >
      {/* Image */}
      <div className="w-full h-24 bg-gray-50">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={fabric.color_name ?? fabric.code}
            className="w-full h-full object-cover brightness-[0.97]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-gray-400">{fabric.code}</span>
          </div>
        )}
      </div>

      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-configurator-accent rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-configurator-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Label */}
      <div className="px-1 py-1.5">
        <p className="text-[10px] text-gray-400 leading-tight truncate">{fabric.code}</p>
        {fabric.color_name && (
          <p className="text-xs text-gray-800 leading-tight truncate">{fabric.color_name}</p>
        )}
      </div>
    </button>
  )
}

export default FabricDrawerCard
