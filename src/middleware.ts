import { NextRequest, NextResponse } from "next/server"
import { withV1Session } from "@lib/v1-session/middleware-binding"
import { isTokenUrlPath } from "@lib/util/token-url-paths"
import { getPublicOrigin } from "@lib/util/public-origin"

/** The GraphQL (legacy) session cookie; the source of truth for "logged in" until 2c-10. */
const LEGACY_SESSION_COOKIE = "_furni_jwt"

// Token landings (/auth/magic-link?token=, /auth/impersonate?token=, ...):
// the credential is in the URL, so never send it as a Referer and never
// cache the page (plan §3.3). See src/lib/util/token-url-paths.ts.
function setTokenUrlHeaders(response: NextResponse) {
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("Cache-Control", "no-store")
}

// Supported languages
const supportedLanguages = ["en", "fr", "de"] as const
type SupportedLanguage = (typeof supportedLanguages)[number]

const DEFAULT_LANGUAGE: SupportedLanguage = "en"

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

  // 3. Check browser language (improved detection)
  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const browserLanguages = acceptLanguage.split(",").map((lang) => {
      // Extract language code and handle quality values
      const langCode = lang.split(";")[0].trim().toLowerCase()
      // Handle both 'en' and 'en-US' formats
      return langCode.split("-")[0]
    })

    // Find the first supported language from browser preferences
    for (const lang of browserLanguages) {
      // Map Danish language codes to our supported "da" code
      if (lang === "dk") {
        return "da" as SupportedLanguage
      }
      if (supportedLanguages.includes(lang as SupportedLanguage)) {
        return lang as SupportedLanguage
      }
    }
  }

  // 4. Default fallback (only when no other detection works)
  return DEFAULT_LANGUAGE
}

/**
 * Middleware: language-based routing, plus (stage 2c-3) the v1 session.
 *
 * v1 session (src/lib/v1-session/middleware-binding.ts withV1Session), only on
 * URLs that already carry a supported locale (the locale redirect below
 * stays as it is; the redirected request runs it). API routes and static
 * files are outside it. In 2c-3 it ONLY refreshes and forwards:
 *   - ok / deferred / unavailable: continue, touch no cookie, never redirect;
 *   - anonymous + cleared "all" (definitive refresh 401): also delete
 *     `_furni_jwt` (D5), forwarded into this request so its render already
 *     shows the logged-out state;
 *   - anonymous + cleared "none" (no v1 cookie: every pre-2c-3 and every
 *     legacy-link login): nothing;
 *   - orphan (v1 cookies without `_furni_jwt`): the binding logs the v1
 *     session out best-effort and clears both v1 cookies, never refreshes it.
 *     Requires `_furni_jwt` to be SameSite=Lax like the v1 cookies.
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
    return withV1Session(
      request,
      ({ result, next, deleteCookie }) => {
        if (result.kind === "anonymous" && result.cleared === "all") {
          deleteCookie(LEGACY_SESSION_COOKIE)
        }

        const requestHeaders = new Headers(request.headers)
        requestHeaders.set("x-pathname", request.nextUrl.pathname)
        const response = next({ requestHeaders })
        response.headers.set("x-pathname", request.nextUrl.pathname)
        response.headers.set("x-language", urlLanguage)

        // Check if this is an account route and add no-cache headers
        const isAccountRoute = request.nextUrl.pathname.includes("/account")
        if (isAccountRoute) {
          // Set comprehensive no-cache headers for account pages
          response.headers.set(
            "Cache-Control",
            "no-cache, no-store, must-revalidate, private"
          )
          response.headers.set("Pragma", "no-cache")
          response.headers.set("Expires", "0")
          response.headers.set("X-Accel-Expires", "0")
          response.headers.set("Surrogate-Control", "no-store")
        }

        if (isTokenUrlPath(request.nextUrl.pathname)) {
          setTokenUrlHeaders(response)
        }

        // Update language preference cookie
        response.cookies.set("preferred-language", urlLanguage, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
        })

        return response
      },
      { companionCookie: LEGACY_SESSION_COOKIE }
    )
  }

  // Detect preferred language and redirect immediately
  const detectedLanguage = detectLanguage(request)
  // Guard against detectLanguage ever resolving to a code outside
  // supportedLanguages (e.g. "da"), which would otherwise make the
  // redirect below target itself forever.
  const preferredLanguage = (
    supportedLanguages as readonly string[]
  ).includes(detectedLanguage)
    ? detectedLanguage
    : DEFAULT_LANGUAGE

  // The first path segment may look like a locale code the portal doesn't
  // serve (e.g. a stale "/lt/..." link from another app). In that case
  // replace it with the preferred language instead of prepending — prepending
  // would produce "/en/lt/..." which 404s. A normal path with no locale
  // prefix keeps the existing behaviour of prepending the language.
  const LOCALE_LIKE_SEGMENT = /^[a-z]{2}(-[a-zA-Z]{2})?$/
  const pathSegments = request.nextUrl.pathname.split("/")
  const firstSegment = pathSegments[1] ?? ""
  const firstSegmentIsUnsupportedLocale =
    LOCALE_LIKE_SEGMENT.test(firstSegment) &&
    !(supportedLanguages as readonly string[]).includes(
      firstSegment.toLowerCase()
    )

  const remainingSegments = firstSegmentIsUnsupportedLocale
    ? pathSegments.slice(2)
    : pathSegments.slice(1)
  const remainingPath = remainingSegments.join("/")
  const redirectPath = remainingPath ? `/${remainingPath}` : ""
  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  // Not request.nextUrl.origin: under `next start -H 127.0.0.1` that is
  // http://localhost:8090, not the public host (see public-origin.ts).
  const publicOrigin = getPublicOrigin(request.headers, request.nextUrl.origin)
  const redirectUrl = `${publicOrigin}/${preferredLanguage}${redirectPath}${queryString}`

  // Use 302 redirect for faster response and set language preference cookie
  const response = NextResponse.redirect(redirectUrl, 302)

  // Set language preference cookie immediately
  response.cookies.set("preferred-language", preferredLanguage, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })

  // Add cache control headers to prevent caching of redirects
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")

  // A locale-less token URL (the emailed magic link): the redirect's
  // Location carries the token too.
  if (isTokenUrlPath(request.nextUrl.pathname)) {
    setTokenUrlHeaders(response)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
