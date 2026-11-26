import { verifyMagicLinkAction } from "@lib/data/customer"
import { normalizeLanguage } from "@lib/i18n/config"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { getURLFromRedirectError } from "next/dist/client/components/redirect"

/**
 * No-JavaScript fallback of the magic-link landing (the <noscript> Continue
 * form in ../magic-link-client.tsx). With JS the page runs the same verify as
 * a server action; a native form POST cannot: the landing is served with
 * `Referrer-Policy: no-referrer`, so the browser sends `Origin: null`, which
 * Next's server-action handler rejects with a 500.
 *
 * Same logic as the action (verifyMagicLinkAction, incl. the "already logged
 * in" redirect); the outcome is a 303 so the browser follows with a GET:
 *   success / logged in -> the action's destination (returnTo or account)
 *   failure             -> the landing with `?status=`, no token in the URL
 *
 * Route handlers get no Origin check from Next; `Sec-Fetch-Site` (not
 * affected by the referrer policy) stands in for it when the browser sends it.
 */
const FAILURE_STATUSES = new Set(["expired", "unavailable", "error"])

function seeOther(location: string): Response {
  // Relative Location: behind the proxy `request.url` is the internal host.
  return new Response(null, { status: 303, headers: { Location: location } })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ languageCode: string }> }
): Promise<Response> {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite && fetchSite !== "same-origin") {
    return new Response(null, { status: 403 })
  }

  const languageCode = normalizeLanguage((await params).languageCode)
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return seeOther(`/${languageCode}/auth/magic-link?status=error`)
  }
  formData.set("languageCode", languageCode)

  try {
    const state = await verifyMagicLinkAction(null, formData)
    const status =
      state && FAILURE_STATUSES.has(state.status) ? state.status : "error"
    return seeOther(`/${languageCode}/auth/magic-link?status=${status}`)
  } catch (error) {
    if (isRedirectError(error)) {
      return seeOther(getURLFromRedirectError(error))
    }
    console.warn(
      "[magic-link] no-JS verify failed:",
      error instanceof Error ? error.name : "Unknown error"
    )
    return seeOther(`/${languageCode}/auth/magic-link?status=error`)
  }
}
