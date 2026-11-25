"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import { useTranslations } from "@lib/i18n"

export default function ActingCustomerCallout() {
  const { t } = useTranslations("common")
  const { customer } = useCustomer()
  const { actingCustomer, isImpersonatedByManager } = useActingCustomer()

  if (!isAgentOrAdmin(customer) && !isImpersonatedByManager) return null
  if (actingCustomer) return null

  return (
    <p role="status" className="text-right text-sm text-dark-blue">
      {t("acting-customer-callout")}
    </p>
  )
}
