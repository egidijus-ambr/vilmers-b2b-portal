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
      {/* Negative margins cancel AccountLayout's p-4 sm:p-6 lg:p-8
          so PageHeader provides the only horizontal padding,
          matching the order details page layout. */}
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <PageHeader
          title={t("orders")}
          description={t("orders-description")}
          breadcrumbItems={breadcrumbItems}
        />
      </div>
      <OrdersTable />
    </div>
  )
}
