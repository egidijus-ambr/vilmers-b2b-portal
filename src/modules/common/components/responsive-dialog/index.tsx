"use client"

import { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import X from "@modules/common/icons/x"

interface ResponsiveDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Additional classes for the Dialog.Panel (e.g., "bg-white" to override default bg-gold-10) */
  className?: string
  /** "default" = md:max-w-5xl, "full" = almost full screen with padding on desktop */
  size?: "default" | "full"
  "data-testid"?: string
}

export default function ResponsiveDialog({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "default",
  "data-testid": dataTestId,
}: ResponsiveDialogProps) {
  const sizeClasses =
    size === "full"
      ? "md:max-w-[95vw] md:h-[93vh]"
      : "md:max-w-5xl md:max-h-[90vh]"
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-opacity-75 backdrop-blur-md h-screen" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-hidden">
          <div className="flex min-h-full h-full justify-center p-0 md:p-4 text-center items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                data-testid={dataTestId}
                className={clx(
                  "flex flex-col w-full h-full md:h-auto transform text-left align-middle transition-all md:shadow-xl md:border md:rounded-rounded",
                  sizeClasses,
                  className ?? "bg-gold-10"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200 flex-shrink-0">
                  <Dialog.Title className="text-lg md:text-xl text-dark-blue font-medium truncate">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-dark-blue hover:opacity-70 transition-opacity ml-4 flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
