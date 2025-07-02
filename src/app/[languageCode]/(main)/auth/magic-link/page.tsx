import { redirect } from "next/navigation"
import MagicLinkClient from "./magic-link-client"

interface MagicLinkPageProps {
  params: Promise<{
    languageCode: string
  }>
  searchParams: Promise<{
    token?: string
  }>
}

export default async function MagicLinkPage({
  params,
  searchParams,
}: MagicLinkPageProps) {
  const { languageCode } = await params
  const { token } = await searchParams

  if (!token) {
    // No token provided, redirect to account page
    redirect(`/${languageCode}/account`)
  }

  return <MagicLinkClient token={token} languageCode={languageCode} />
}
