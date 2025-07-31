import { Metadata } from "next"

// Force dynamic rendering to prevent caching of protected pages
export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default function AccountPage() {
  return null
}
