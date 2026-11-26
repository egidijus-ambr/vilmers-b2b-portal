import { redirect } from "next/navigation"
import { normalizeLanguage } from "@lib/i18n/config"
import MagicLinkClient from "./magic-link-client"

interface MagicLinkPageProps {
  params: Promise<{
    languageCode: string
  }>
  searchParams: Promise<{
    token?: string | string[]
    status?: string | string[]
  }>
}

// v1 magic links are reusable until they expire (backend TTL, 15 minutes),
// so the landing verifies automatically on mount: a mail scanner opening the
// link first no longer burns it, and the user needs no extra click. The
// verify stays in the server action (verifyMagicLinkAction) because a server
// page cannot set cookies; without JavaScript a Continue button submits the
// same action. The middleware sends this page with
// `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.
// `?status=` (no token) is where the no-JS fallback (./verify/route.ts) lands
// after a failed verify.
function isFailureStatus(
  value: string | undefined
): value is FailureStatus {
  return value === "expired" || value === "unavailable" || value === "error"
}

type FailureStatus = "expired" | "unavailable" | "error"

export default async function MagicLinkPage({
  params,
  searchParams,
}: MagicLinkPageProps) {
  const languageCode = normalizeLanguage((await params).languageCode)
  const query = await searchParams
  const first = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value
  const token = first(query.token)

  if (!token) {
    const status = first(query.status)
    if (isFailureStatus(status)) {
      return (
        <MagicLinkClient
          token=""
          languageCode={languageCode}
          initialStatus={status}
        />
      )
    }
    // No token provided, redirect to account page
    redirect(`/${languageCode}/account`)
  }

  return <MagicLinkClient token={token} languageCode={languageCode} />
}
