"use client"

import React from "react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  showSearchIcon?: boolean
  label?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  "data-testid"?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({
  value,
  onChange,
  placeholder = "Search...",
  showSearchIcon = true,
  label,
  autoFocus,
  onKeyDown,
  "data-testid": dataTestId,
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {showSearchIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-dark-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          data-testid={dataTestId}
          className={`block w-full h-14 text-base ${showSearchIcon ? "pl-10" : "pl-3"} pr-3 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
        />
      </div>
    </div>
  )
})

export default SearchInput
