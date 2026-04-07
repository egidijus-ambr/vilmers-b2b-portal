"use client"

import React from "react"
import { clx } from "@medusajs/ui"
import type { StepDefinition } from "@configurator/lib/types"

type ConfiguratorStepperProps = {
  steps: StepDefinition[]
  currentStep: number
  onStepChange: (index: number) => void
  canNavigateToStep?: (index: number) => boolean
}

const ConfiguratorStepper = ({
  steps,
  currentStep,
  onStepChange,
  canNavigateToStep,
}: ConfiguratorStepperProps) => {
  return (
    <div className="w-full">
      <div className="flex">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          const isLocked = canNavigateToStep ? !canNavigateToStep(index) : false

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              {/* Circle */}
              <button
                onClick={() => !isLocked && onStepChange(index)}
                disabled={isLocked}
                className={clx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors z-10",
                  {
                    "bg-[#1e2a3a] text-white": (isActive || isCompleted) && !isLocked,
                    "bg-gray-200 text-gray-500": (!isActive && !isCompleted) || isLocked,
                    "cursor-not-allowed opacity-50": isLocked,
                  }
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </button>

              {/* Label */}
              <span
                className={clx(
                  "mt-1.5 text-[10px] leading-tight text-center px-0.5",
                  {
                    "text-gray-900 font-semibold": isActive,
                    "text-gray-400": !isActive,
                  }
                )}
              >
                {step.label}
              </span>

              {/* Connector line to next step */}
              {index < steps.length - 1 && (
                <div
                  className={clx(
                    "absolute top-4 h-px left-[calc(50%+16px)] right-[calc(-50%+16px)]",
                    {
                      "bg-[#1e2a3a]": index < currentStep,
                      "bg-gray-200": index >= currentStep,
                    }
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ConfiguratorStepper
