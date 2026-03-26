"use client"

import React from "react"
import { clx } from "@medusajs/ui"
import type { StepDefinition } from "@configurator/lib/types"

type ConfiguratorStepperProps = {
  steps: StepDefinition[]
  currentStep: number
  onStepChange: (index: number) => void
}

const ConfiguratorStepper = ({
  steps,
  currentStep,
  onStepChange,
}: ConfiguratorStepperProps) => {
  return (
    <div className="w-full">
      {/* Top row: circles + connector lines */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = index < currentStep

          return (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <button
                onClick={() => onStepChange(index)}
                className={clx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  {
                    "bg-[#1e2a3a] text-white": isActive || isCompleted,
                    "bg-gray-200 text-gray-500": !isActive && !isCompleted,
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

              {/* Connector line (not after last) */}
              {index < steps.length - 1 && (
                <div
                  className={clx("flex-1 h-px mx-2", {
                    "bg-[#1e2a3a]": index < currentStep,
                    "bg-gray-200": index >= currentStep,
                  })}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Bottom row: labels aligned under circles */}
      <div className="flex mt-1.5">
        {steps.map((step, index) => {
          const isActive = index === currentStep

          return (
            <React.Fragment key={step.id}>
              {/* Label — same width as circle */}
              <div className="w-8 shrink-0 flex justify-center">
                <span
                  className={clx(
                    "text-[10px] leading-tight text-center whitespace-nowrap",
                    {
                      "text-gray-900 font-semibold": isActive,
                      "text-gray-400": !isActive,
                    }
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Spacer matching connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default ConfiguratorStepper
