import React from "react"

interface InfoRowProps {
  label: string
  value: React.ReactNode
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}

export default InfoRow
