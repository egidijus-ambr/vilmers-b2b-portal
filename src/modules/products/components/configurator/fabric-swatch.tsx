"use client"

import React from "react"
import { clx } from "@medusajs/ui"

type FabricSwatchProps = {
  fabric: {
    id: number
    code: string
    color_name: string | null
    image: { src: string; src_md: string | null; src_xs: string | null } | null
  }
  isSelected: boolean
  onClick: () => void
}

const FabricSwatch = ({ fabric, isSelected, onClick }: FabricSwatchProps) => {
  const imageSrc = fabric.image?.src_xs ?? fabric.image?.src_md ?? fabric.image?.src

  return (
    <button
      onClick={onClick}
      title={fabric.color_name ?? fabric.code}
      className={clx(
        "relative w-12 h-12 rounded border-2 overflow-hidden transition-all hover:scale-110 focus:outline-none",
        {
          "border-[#1e2a3a] ring-1 ring-[#1e2a3a]": isSelected,
          "border-gray-200 hover:border-gray-400": !isSelected,
        }
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={fabric.color_name ?? fabric.code}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <span className="text-[8px] text-gray-400">{fabric.code}</span>
        </div>
      )}
    </button>
  )
}

export default FabricSwatch
