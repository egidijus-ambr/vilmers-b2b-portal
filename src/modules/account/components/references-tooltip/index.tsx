"use client"

import React, { useState } from "react"

interface ReferencesTooltipProps {
  references: string[]
  children: React.ReactNode
}

const ReferencesTooltip = ({
  references,
  children,
}: ReferencesTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)

  if (!references || references.length === 0) {
    return <>{children}</>
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div className="absolute z-50 bottom-full left-0 mb-2 min-w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-200 translate-y-px"></div>

          {/* Content */}
          <div className="p-3">
            {/* <div className="text-sm font-medium text-gray-900 mb-2">
              Customers References
            </div> */}
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1 px-2 font-medium text-gray-700">
                      #
                    </th>
                    <th className="text-left py-1 px-2 font-medium text-gray-700">
                      Customers References
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {references.map((reference, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-50 last:border-b-0"
                    >
                      <td className="py-1 px-2 text-gray-600">{index + 1}</td>
                      <td className="py-1 px-2 text-gray-900 font-mono text-xs break-all">
                        {reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferencesTooltip
