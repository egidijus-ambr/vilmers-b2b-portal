import React from "react"

interface StatusBadgeProps {
  status: string
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusClasses = () => {
    switch (status) {
      case "AWAITING_SINCHRONIZATION":
        return "bg-status-pending text-dark-blue"
      case "AWAITING_CONFIRMATION":
        return "bg-status-pending text-dark-blue"
      case "ERROR":
        return "bg-red-400 text-white"
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

  const formatStatusText = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase()
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusClasses()}`}
    >
      {formatStatusText(status)}
    </span>
  )
}

export default StatusBadge
