import { Metadata } from "next"
import { retrieveCustomer } from "@lib/data/customer"

import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata(): Promise<Metadata> {
  const customer = await retrieveCustomer().catch(() => null)

  if (customer) {
    return {
      title: "Account",
      description: "Manage your Vilmers Store account.",
    }
  }

  return {
    title: "Sign in",
    description: "Sign in to your Vilmers Store account.",
  }
}

export default function Login() {
  return <LoginTemplate />
}
