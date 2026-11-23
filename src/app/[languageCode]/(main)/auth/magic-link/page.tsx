import { redirect } from "next/navigation"
import { normalizeLanguage } from "@lib/i18n/config"
import MagicLinkClient from "./magic-link-client"

interface MagicLinkPageProps {
  params: Promise<{
    languageCode: string
  }>
  searchParams: Promise<{
    token?: string | string[]
  }>
}

// Stage 2c-3 (plan §3.3): the token is used only when the user presses
// Continue (no auto-submit: mail scanners that run JavaScript would burn the
// single-use link). The middleware sends this page with
// `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.
export default async function MagicLinkPage({
  params,
  searchParams,
}: MagicLinkPageProps) {
  const languageCode = normalizeLanguage((await params).languageCode)
  const raw = (await searchParams).token
  const token = Array.isArray(raw) ? raw[0] : raw

  if (!token) {
    // No token provided, redirect to account page
    redirect(`/${languageCode}/account`)
  }

  return <MagicLinkClient token={token} languageCode={languageCode} />
}
