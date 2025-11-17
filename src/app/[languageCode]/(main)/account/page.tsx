"use client"

import { useCustomer } from "@lib/context/customer-context"
import LoginTemplate from "@modules/account/templates/login-template"
import Overview from "@modules/account/components/overview"

export default function AccountPage() {
  const { customer } = useCustomer()

  if (!customer) {
    return <LoginTemplate />
  }

  return <Overview />
}
