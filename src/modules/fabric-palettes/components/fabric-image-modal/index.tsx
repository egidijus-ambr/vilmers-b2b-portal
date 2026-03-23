"use client"

import { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import X from "@modules/common/icons/x"

interface FabricImageModalProps {
  isOpen: boolean
  onClose: () => void
  fabricName: string
  imageSrc: string
}

export default function FabricImageModal({
  isOpen,
  onClose,
  fabricName,
  imageSrc,
}: FabricImageModalProps) {
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
              <Dialog.Panel className="flex flex-col w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] transform text-left align-middle transition-all bg-gold-10 md:shadow-xl md:border md:rounded-rounded">
                {/* Header */}
                <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200 flex-shrink-0">
                  <Dialog.Title className="text-lg md:text-xl text-dark-blue font-medium truncate">
                    {fabricName}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-dark-blue hover:opacity-70 transition-opacity ml-4 flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Image */}
                <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-gold-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={fabricName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
