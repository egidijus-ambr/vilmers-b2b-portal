import { normalizeLanguage } from "@lib/i18n/config"
import ImpersonationClient from "./impersonation-client"

interface ImpersonationPageProps {
  params: Promise<{
    languageCode: string
  }>
}

// Stage 2c-4 landing: `/<lang>/auth/impersonation#code=<handoff code>`
// (saas-admin-ui useImpersonateB2BPortal). The code is in the FRAGMENT, so
// the server never sees it here; the client reads it once, strips it from
// the URL and hands it to the server action, which redeems it with the
// backend (POST /auth/impersonation/exchange) and sets the cookies. The
// middleware serves this path with `Referrer-Policy: no-referrer` and
// `Cache-Control: no-store`, and no third-party script loads on it
// (src/lib/util/token-url-paths.ts).
export default async function ImpersonationPage({
  params,
}: ImpersonationPageProps) {
  const languageCode = normalizeLanguage((await params).languageCode)
  return <ImpersonationClient languageCode={languageCode} />
}
