"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Use this component to create a Next.js `<Link />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
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
  const languageCode = params?.languageCode || "lt" // fallback to default language

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
    return (
      <a href={href} target="_self" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }

  return (
    <Link href={`/${languageCode}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
