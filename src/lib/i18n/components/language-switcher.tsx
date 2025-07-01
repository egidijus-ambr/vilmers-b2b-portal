"use client"

import React, { useState } from "react"
import { clx } from "@medusajs/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import { useTranslations } from "../provider"
import { supportedLanguages, SupportedLanguage } from "../index"

interface LanguageSwitcherProps {
  className?: string
  variant?: "dropdown" | "buttons"
}

const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  lt: "Lietuvių",
}

const languageFlags: Record<SupportedLanguage, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  lt: "🇱🇹",
}

export function LanguageSwitcher({
  className = "",
  variant = "dropdown",
}: LanguageSwitcherProps) {
  const { language, changeLanguage, isLoading } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage !== language) {
      await changeLanguage(newLanguage)
      setIsOpen(false)
    }
  }

  if (variant === "buttons") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            disabled={isLoading}
            className={`
              px-3 py-2 rounded-md text-sm font-medium transition-colors
              ${
                language === lang
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
              ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
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
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 
          bg-white text-gray-700 hover:bg-gray-50 transition-colors
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
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
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm text-left
                    transition-colors
                    ${
                      language === lang
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                    ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
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
}: {
  className?: string
}) {
  const { language, changeLanguage, isLoading } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    if (newLanguage !== language) {
      await changeLanguage(newLanguage)
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center justify-center w-16 h-10 text-base font-medium font-['Montserrat'] 
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
        title={languageNames[language]}
      >
        <span className="text-lg pr-1">{language.toUpperCase()}</span>
        <ChevronDown
          className={clx("transition-transform duration-200", {
            "rotate-180": isOpen,
          })}
          size={16}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20 text-dark-blue">
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                    transition-colors
                    ${
                      language === lang
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                    ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
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
