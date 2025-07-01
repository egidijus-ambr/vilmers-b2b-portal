import { NextRequest, NextResponse } from "next/server"

// Supported languages
const supportedLanguages = ["en", "fr", "de", "lt"] as const
type SupportedLanguage = (typeof supportedLanguages)[number]

const DEFAULT_LANGUAGE: SupportedLanguage = "lt"

/**
 * Detects the user's preferred language from various sources
 */
function detectLanguage(request: NextRequest): SupportedLanguage {
  // 1. Check URL path first (highest priority)
  const urlLanguage = request.nextUrl.pathname
    .split("/")[1]
    ?.toLowerCase() as SupportedLanguage
  if (urlLanguage && supportedLanguages.includes(urlLanguage)) {
    return urlLanguage
  }

  // 2. Check stored language preference cookie
  const storedLanguage = request.cookies.get("preferred-language")
    ?.value as SupportedLanguage
  if (storedLanguage && supportedLanguages.includes(storedLanguage)) {
    return storedLanguage
  }

  // 3. Check browser language
  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const browserLanguages = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0].split("-")[0].toLowerCase())

    for (const lang of browserLanguages) {
      if (supportedLanguages.includes(lang as SupportedLanguage)) {
        return lang as SupportedLanguage
      }
    }
  }

  // 4. Default fallback
  return DEFAULT_LANGUAGE
}

/**
 * Middleware to handle language-based routing
 */
export async function middleware(request: NextRequest) {
  // Skip static assets
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  // Skip API routes
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const urlLanguage = request.nextUrl.pathname
    .split("/")[1]
    ?.toLowerCase() as SupportedLanguage
  const hasLanguageInUrl =
    urlLanguage && supportedLanguages.includes(urlLanguage)

  // If URL already has a valid language code, continue
  if (hasLanguageInUrl) {
    const response = NextResponse.next()
    response.headers.set("x-pathname", request.nextUrl.pathname)
    response.headers.set("x-language", urlLanguage)

    // Update language preference cookie
    response.cookies.set("preferred-language", urlLanguage, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })

    return response
  }

  // Detect preferred language and redirect
  const preferredLanguage = detectLanguage(request)
  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  const redirectUrl = `${request.nextUrl.origin}/${preferredLanguage}${redirectPath}${queryString}`
  const response = NextResponse.redirect(redirectUrl, 307)

  // Set language preference cookie
  response.cookies.set("preferred-language", preferredLanguage, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
