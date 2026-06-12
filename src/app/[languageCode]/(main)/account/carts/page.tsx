"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import CartsTable from "@modules/account/components/carts-table"
import PageContent from "@modules/common/components/page-content"
import PageHeader from "@modules/common/components/page-header"
import { useTranslations } from "@lib/i18n"

export default function CartsPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const { t } = useTranslations("account")

  if (!customer) {
    router.push("/account")
    return null
  }

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-my-profile"), href: "/account" },
    { label: t("breadcrumb-carts"), href: null },
  ]

  return (
    <>
      <PageHeader
        title={t("carts")}
        description={t("carts-description")}
        breadcrumbItems={breadcrumbItems}
      />
      <PageContent noPaddingX>
        <CartsTable hideTitle />
      </PageContent>
    </>
  )
}
