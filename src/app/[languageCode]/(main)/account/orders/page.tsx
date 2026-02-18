"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import OrdersTable from "@modules/account/components/orders-table"
import PageHeader from "@modules/common/components/page-header"
import { useTranslations } from "@lib/i18n"

export default function OrdersPage() {
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
    { label: t("breadcrumb-orders-history"), href: null },
  ]

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <PageHeader
        title={t("orders")}
        description={t("orders-description")}
        breadcrumbItems={breadcrumbItems}
      />

      <OrdersTable />
    </div>
  )
}
