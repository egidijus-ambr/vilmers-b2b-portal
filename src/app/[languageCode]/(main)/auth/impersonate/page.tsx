import { redirect } from "next/navigation"
import ImpersonateClient from "./impersonate-client"

interface ImpersonatePageProps {
  params: Promise<{
    languageCode: string
  }>
  searchParams: Promise<{
    token?: string
  }>
}

export default async function ImpersonatePage({
  params,
  searchParams,
}: ImpersonatePageProps) {
  const { languageCode } = await params
  const { token } = await searchParams

  if (!token) {
    redirect(`/${languageCode}/account`)
  }

  return <ImpersonateClient token={token} languageCode={languageCode} />
}
