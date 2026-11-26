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

// v1 magic links are reusable until they expire (backend TTL, 15 minutes),
// so the landing verifies automatically on mount: a mail scanner opening the
// link first no longer burns it, and the user needs no extra click. The
// verify stays in the server action (verifyMagicLinkAction) because a server
// page cannot set cookies. Without JavaScript the page only asks to enable
// it (the portal needs JS throughout). The middleware sends this page with
// `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.
export default async function MagicLinkPage({
  params,
  searchParams,
}: MagicLinkPageProps) {
  const languageCode = normalizeLanguage((await params).languageCode)
  const { token: rawToken } = await searchParams
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken

  if (!token) {
    // No token provided, redirect to account page
    redirect(`/${languageCode}/account`)
  }

  return <MagicLinkClient token={token} languageCode={languageCode} />
}
