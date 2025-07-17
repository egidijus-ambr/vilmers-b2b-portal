"use client"

import React from "react"
import ArrowRight from "@modules/common/icons/arrow-right"

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
    <div className="w-full p-4 sm:p-6 bg-white flex flex-col justify-start items-start gap-2.5 h-[200px] sm:h-[232px]">
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
            <ArrowRight color="dark-blue" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActionCard
