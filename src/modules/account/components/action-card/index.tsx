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
    <div className="w-full p-4 sm:p-6 bg-white flex flex-col justify-start items-start gap-2.5 h-[200px] sm:h-[232px] rounded-lg">
      <div className="self-stretch flex-1 flex flex-col justify-between items-start">
        <div className="self-stretch flex flex-col justify-start items-start gap-2">
          <div className="self-stretch justify-start text-dark-blue text-lg sm:text-xl font-medium font-['Montserrat'] leading-7 sm:leading-9">
            {title}
          </div>
          <p className="self-stretch justify-start text-dark-blue-70 text-sm sm:text-base font-normal line-clamp-3">
            {description}
          </p>
        </div>
        <div className="inline-flex justify-between items-center mt-4">
          <button
            onClick={onClick}
            className="inline-flex items-center hover:opacity-70 transition-opacity"
          >
            <span className="pr-2 text-slate-800 text-sm sm:text-base font-medium font-['Montserrat'] leading-normal">
              {buttonText}
            </span>
            <svg
              width="20"
              height="9"
              viewBox="0 0 24 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="sm:w-6 sm:h-[11px]"
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
