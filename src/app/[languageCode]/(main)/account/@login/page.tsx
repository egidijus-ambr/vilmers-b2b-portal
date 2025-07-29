import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

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
