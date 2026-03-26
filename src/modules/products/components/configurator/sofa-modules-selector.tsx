"use client"

import React, { useState } from "react"
import type { SofaFormExtended } from "@configurator/lib/types"
import SofaModulesDrawer from "./sofa-modules-drawer"

type SofaModulesSelectorProps = {
  sofaForms: SofaFormExtended[]
  onAddForm: (sofaForm: SofaFormExtended) => void
  languageCode: string
}

/**
 * Compact sofa modules selector row.
 * Shows a row of small module thumbnails and a count badge.
 * Clicking opens the full SofaModulesDrawer.
 */
const SofaModulesSelector = ({
  sofaForms,
  onAddForm,
  languageCode,
}: SofaModulesSelectorProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const previewForms = [...sofaForms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 11)

  const extraCount = sofaForms.length > 11 ? sofaForms.length - 11 : 0

  return (
    <>
      {/* Compact clickable row */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full flex items-end gap-3 pr-4 border border-gray-200 hover:border-gray-400 transition-colors text-left"
      >
        {/* Label block */}
        <div className="w-32 shrink-0 h-20 flex flex-col justify-end pb-2 pl-3 border-r border-gray-200 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            Sofa Modules
          </p>
          <p className="text-sm font-medium text-gray-900">
            {sofaForms.length} available
          </p>
        </div>

        {/* Thumbnails row with fade-out on right edge */}
        <div className="relative flex-1 min-w-0 overflow-hidden h-20 flex items-center">
          {/* Fade-out gradient overlay */}
          <div
            className="absolute inset-y-0 right-0 w-16 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to right, transparent, white)",
            }}
          />

          {/* Thumbnails */}
          <div className="flex items-center gap-1">
            {previewForms.map((form) => {
              const imageSrc =
                form.images?.[0]?.src_md ?? form.images?.[0]?.src ?? null

              return (
                <div
                  key={form.id}
                  className="w-16 h-16 shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden"
                  title={form.name}
                >
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={form.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] text-gray-400 font-bold text-center px-0.5 leading-tight">
                      {form.type}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Extra count badge */}
            {extraCount > 0 && (
              <div className="w-16 h-16 shrink-0 flex flex-col items-center justify-center bg-gray-100 border border-gray-200">
                <span className="text-sm font-bold text-gray-700">
                  +{extraCount}
                </span>
                <span className="text-[10px] text-gray-500">more</span>
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className="w-4 h-8 text-gray-400 shrink-0 pb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Drawer */}
      <SofaModulesDrawer
        isOpen={drawerOpen}
        close={() => setDrawerOpen(false)}
        sofaForms={sofaForms}
        onAddForm={onAddForm}
        languageCode={languageCode}
      />
    </>
  )
}

export default SofaModulesSelector
