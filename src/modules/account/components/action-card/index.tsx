"use client"

import React from "react"
import ChevronDown from "@modules/common/icons/chevron-down"

interface ActionCardProps {
  title: string
  description: string
  buttonText?: string
  onClick?: () => void
}

const ActionCard = ({
  title,
  description,
  buttonText = "Check",
  onClick,
}: ActionCardProps) => {
  return (
    <div className="flex-1 min-w-0 p-6 bg-white inline-flex flex-col justify-start items-start gap-2.5 h-[232px]">
      <div className="self-stretch h-44 flex flex-col justify-between items-start">
        <div className="self-stretch flex flex-col justify-start items-start gap-2">
          <div className="self-stretch justify-start text-dark-blue text-xl font-medium font-['Montserrat'] leading-9">
            {title}
          </div>
          <p className="self-stretch justify-start text-dark-blue-70 text-base font-normal">
            {description}
          </p>
        </div>
        <div className="inline-flex justify-between items-center">
          <button
            onClick={onClick}
            className="inline-flex items-center hover:opacity-70 transition-opacity"
          >
            <span className="pr-2 text-slate-800 text-base font-medium font-['Montserrat'] leading-normal">
              {buttonText}
            </span>
            <svg
              width="24"
              height="11"
              viewBox="0 0 24 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.3711 9.74805L22.745 5.37412L18.3711 1.00019"
                stroke="#222D37"
                strokeLinecap="round"
              />
              <path
                d="M22.7461 5.37402L0.5 5.37402"
                stroke="#222D37"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActionCard
