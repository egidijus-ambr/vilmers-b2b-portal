"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"
import { isInternalDomain } from "@lib/utils/internal-domains"

/**
 * Use this component to create a Next.js `<Link />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 *
 * For external links (starting with http:// or https://):
 * - Internal domains (*.furnisystems.com, shop.vilmers.com, my.vilmers.com, dev.my.vilmers.com, localhost) open within PWA (target="_self")
 * - All other external links open in new tab (target="_blank") for better PWA experience
 * - Includes security attributes (rel="noopener noreferrer")
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string | null
  className?: string
  onClick?: () => void
  passHref?: true
  [x: string]: any
}) => {
  const params = useParams()
  const languageCode = params?.languageCode || "en" // fallback to default language

  // If href is null, render as a span with cursor-pointer styling
  if (href === null) {
    return (
      <span className={`cursor-pointer ${props.className || ""}`} {...props}>
        {children}
      </span>
    )
  }

  // If href starts with http or https, render as external link
  if (href.startsWith("http://") || href.startsWith("https://")) {
    // Internal domains open within PWA, external domains open in new tab
    //if (isInternalDomain(href)) {
    return (
      <a href={href} target="_self" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
    // }

    // return (
    //   <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
    //     {children}
    //   </a>
    // )
  }

  return (
    <Link href={`/${languageCode}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
