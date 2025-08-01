import React from "react"
import { useTranslations } from "@lib/i18n"

const orderStatusesTextKeys = {
  AWAITING_SINCHRONIZATION: "submitted",
  MANUFACTURING: "manufacturing",
  AWAITING_CONFIRMATION: "waiting-for-confirmation",
  ERROR: "submitted",
  CANCELLED: "cancelled",
  AWAITING_PAYMENT: "awaiting-payment",
  PAYMENT_COMPLETED: "payment-completed",
  REFUNDED: "refunded",
  PARTIALLY_DELIVERED: "partially-delivered",
  COMPLETED: "dispatched",
}

interface StatusBadgeProps {
  status: string
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslations("account")
  const getStatusClasses = () => {
    switch (status) {
      case "AWAITING_SINCHRONIZATION":
        return "bg-status-pending text-dark-blue"
      case "AWAITING_CONFIRMATION":
        return "bg-status-pending text-dark-blue"
      case "ERROR":
        return "bg-status-pending text-dark-blue"
      case "CANCELLED":
        return "bg-status-canceled text-dark-blue"
      case "AWAITING_PAYMENT":
        return "bg-status-awaiting-payment text-dark-blue"
      case "MANUFACTURING":
        return "bg-status-shipping text-dark-blue"
      case "PAYMENT_COMPLETED":
        return "bg-status-paid text-dark-blue"
      case "REFUNDED":
        return "bg-status-delivered text-dark-blue"
      case "PARTIALLY_DELIVERED":
        return "bg-status-delivered text-dark-blue"
      case "COMPLETED":
        return "bg-status-completed text-white"
      default:
        return "bg-status-pending text-dark-blue"
    }
  }

  const getTranslatedStatus = (status: string) => {
    const translationKey =
      orderStatusesTextKeys[status as keyof typeof orderStatusesTextKeys]
    return translationKey
      ? t(translationKey)
      : status.replace(/_/g, " ").toLowerCase()
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusClasses()}`}
    >
      {getTranslatedStatus(status)}
    </span>
  )
}

export default StatusBadge
