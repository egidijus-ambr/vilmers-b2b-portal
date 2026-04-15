"use client"

import { useState, useRef, useEffect } from "react"

interface InlineReferenceEditProps {
  reference: string
  label: string
  onSave: (newReference: string) => Promise<void>
}

export function InlineReferenceEdit({
  reference,
  label,
  onSave,
}: InlineReferenceEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(reference)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditing) {
      setValue(reference)
    }
  }, [reference, isEditing])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === reference) {
      handleCancel()
      return
    }
    setIsSaving(true)
    try {
      await onSave(trimmed)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(reference)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <p className="text-dark-blue-70 text-sm mt-0.5 flex items-center gap-1.5">
        <span>{label}:</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-dark-blue border-b border-dashed border-dark-blue-40 hover:border-dark-blue cursor-pointer pb-px"
        >
          {reference}
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="text-dark-blue-40 hover:text-dark-blue"
          aria-label="Edit reference"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="text-dark-blue-70 text-sm">{label}:</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") handleCancel()
        }}
        disabled={isSaving}
        className="border border-gray-300 px-2 py-1 text-sm text-dark-blue bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-44"
      />
      <button
        onClick={handleSave}
        disabled={!value.trim() || isSaving}
        className="text-dark-blue hover:text-dark-blue/70 disabled:opacity-50"
        aria-label="Save"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
      <button
        onClick={handleCancel}
        disabled={isSaving}
        className="text-dark-blue-70 hover:text-dark-blue"
        aria-label="Cancel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
