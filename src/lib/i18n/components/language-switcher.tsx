"use client"

import React, { useState } from "react"
import { clx } from "@medusajs/ui"
import { useRouter, usePathname } from "next/navigation"
import ChevronDown from "@modules/common/icons/chevron-down"
import { useTranslations } from "../provider"
import { supportedLanguages, SupportedLanguage } from "../index"

interface LanguageSwitcherProps {
  className?: string
  variant?: "dropdown" | "buttons"
}

const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  lt: "Lietuvių",
  da: "Dansk",
}

const languageFlags: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  lt: "🇱🇹",
  da: "🇩🇰",
}

export function LanguageSwitcher({
  className = "",
  variant = "dropdown",
}: LanguageSwitcherProps) {
  const { language } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    if (newLanguage !== language) {
      // Extract the current path without the language prefix
      const pathSegments = pathname.split("/")
      const currentPath = pathSegments.slice(2).join("/") // Remove empty string and language code

      // Navigate to the new language URL with full page refresh for server-side components
      const newPath = `/${newLanguage}${currentPath ? `/${currentPath}` : ""}`
      window.location.href = newPath

      setIsOpen(false)
    }
  }

  const sortedLanguages = supportedLanguages.toSorted((a, b) =>
    languageNames[a].localeCompare(languageNames[b])
  )

  if (variant === "buttons") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {sortedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={`
              px-3 py-2 rounded-md text-sm font-sm transition-colors
              ${
                language === lang
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            <span className="mr-1">{languageFlags[lang]}</span>
            {languageNames[lang]}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>{languageFlags[language]}</span>
        <span className="text-sm font-medium">{languageNames[language]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white  shadow-lg z-20">
            <div className="py-1">
              {sortedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm text-left
                    transition-colors
                    ${
                      language === lang
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <span>{languageFlags[lang]}</span>
                  <span>{languageNames[lang]}</span>
                  {language === lang && (
                    <svg
                      className="w-4 h-4 ml-auto text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for mobile/small spaces
export function CompactLanguageSwitcher({
  className = "",
  size = "default",
  dropdownAlign = "right",
  variant = "default",
}: {
  className?: string
  size?: "default" | "small"
  dropdownAlign?: "left" | "right"
  /**
   * `"default"` (top-bar/mobile-drawer usages, unchanged): trigger keeps its
   * current appearance. `"nav"` (navbar placement, `layout.languageSwitcher
   * .placement === "navbar"`): trigger text uses `text-inherit`/currentColor
   * instead so it follows the surrounding nav text color — `text-white` on
   * the transparent homepage, `text-nav-foreground` when solid — set by the
   * nav on the wrapping element. Do not use `"nav"` outside the navbar
   * placement.
   */
  variant?: "default" | "nav"
}) {
  const { language } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    if (newLanguage !== language) {
      // Extract the current path without the language prefix
      const pathSegments = pathname.split("/")
      const currentPath = pathSegments.slice(2).join("/") // Remove empty string and language code

      // Navigate to the new language URL with full page refresh for server-side components
      const newPath = `/${newLanguage}${currentPath ? `/${currentPath}` : ""}`
      window.location.href = newPath
      setIsOpen(false)
    }
  }

  const sortedLanguages = supportedLanguages.toSorted((a, b) =>
    languageNames[a].localeCompare(languageNames[b])
  )

  // Nav variant: font size matches the nav-menu links (`text-sm`, see
  // `nav-menu-item/index.tsx`) instead of the size-driven `text-[10px]`/
  // `text-base` — height/width from `size` are kept as-is (layout only).
  // Non-"nav" variants (top-bar, mobile-drawer) are untouched.
  const triggerTextSizeClass =
    variant === "nav" ? "text-sm" : size === "small" ? "text-[10px]" : "text-base"
  const labelTextSizeClass =
    variant === "nav" ? "text-sm" : size === "small" ? "text-[10px]" : "text-sm"

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clx(
          "flex items-center font-medium",
          size === "small" ? "h-6" : "w-16 h-10",
          triggerTextSizeClass,
          variant === "nav" && "text-inherit"
        )}
        title={languageNames[language]}
      >
        <span className={clx("pr-1", labelTextSizeClass)}>
          {language.toUpperCase()}
        </span>
        <ChevronDown
          className={clx("transition-transform duration-200", {
            "rotate-180": isOpen,
          })}
          size={size === "small" ? 12 : 16}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className={clx("absolute mt-2 w-40 bg-white border shadow-lg z-20 text-dark-blue", dropdownAlign === "left" ? "left-0" : "right-0")}>
            <div className="py-1">
              {sortedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                    transition-colors
                    ${
                      language === lang
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <span>{languageFlags[lang]}</span>
                  <span className="text-xs">{lang.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
