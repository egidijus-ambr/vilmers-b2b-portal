"use client"

import CartTemplate from "@modules/cart/templates"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import { useTranslations } from "@lib/i18n"
import { useCustomer } from "@lib/context/customer-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"

export default function Cart() {
  const { t } = useTranslations("account")
  const { customer } = useCustomer()
  const router = useRouter()
  const { languageCode } = useParams() as { languageCode: string }

  useEffect(() => {
    if (!customer) {
      router.push(`/${languageCode}/account`)
    }
  }, [customer, router, languageCode])

  if (!customer) return null

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-cart"), href: null },
  ]

  return (
    <>
      <PageHeader
        title={t("cart-details")}
        breadcrumbItems={breadcrumbItems}
      />
      <PageContent>
        <CartTemplate />
      </PageContent>
    </>
  )
}
