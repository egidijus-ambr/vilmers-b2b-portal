import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

// Force dynamic rendering to prevent caching of protected pages
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  // Customer data will be provided by the layout
  return {
    title: "Sign in",
    description: "Sign in to your Vilmers Store account.",
  }
}

export default function Login() {
  console.log("[Login] Login page component rendering...")
  return <LoginTemplate />
}
