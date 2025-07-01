"use client"

import { useEffect } from "react"
import { useTranslations } from "../provider"

export function HtmlLangUpdater() {
  const { language } = useTranslations()

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language
    }
  }, [language])

  return null
}
