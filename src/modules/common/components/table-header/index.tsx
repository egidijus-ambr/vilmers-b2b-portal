import React from "react"

interface TableHeaderProps {
  children: React.ReactNode
}

interface TableHeaderCellProps {
  children: React.ReactNode
  className?: string
  align?: "left" | "right"
}

export const TableHeader = ({ children }: TableHeaderProps) => {
  return (
    <thead>
      <tr className="bg-gold-20 h-[72px]">{children}</tr>
    </thead>
  )
}

export const TableHeaderCell = ({
  children,
  className = "",
  align = "left",
}: TableHeaderCellProps) => {
  return (
    <th
      className={`px-4 text-sm font-medium text-dark-blue ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  )
}
