"use client"

import React, { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import type { FabricCombination } from "@configurator/lib/types"

type FabricCombinationDrawerProps = {
  isOpen: boolean
  close: () => void
  fabricCombinations: FabricCombination[]
  selectedId: number | null
  onSelect: (combination: FabricCombination) => void
  getName: (combination: FabricCombination) => string
}

const FabricCombinationDrawer = ({
  isOpen,
  close,
  fabricCombinations,
  selectedId,
  onSelect,
  getName,
}: FabricCombinationDrawerProps) => {
  const handleSelect = (combination: FabricCombination) => {
    onSelect(combination)
    close()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
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
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Drawer panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-[500px] bg-gold-20 shadow-xl flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Dialog.Title className="text-lg font-semibold">
                      Fabric Combination
                    </Dialog.Title>
                    <button
                      onClick={close}
                      className="p-1 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Combination cards */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {fabricCombinations.map((combination) => {
                      const isSelected = selectedId === combination.id
                      const name = getName(combination)
                      return (
                        <button
                          key={combination.id}
                          onClick={() => handleSelect(combination)}
                          className={clx(
                            "w-full text-left overflow-hidden border transition-all",
                            {
                              "ring-2 ring-[#1e2a3a] border-[#1e2a3a]": isSelected,
                              "border-gray-200 hover:border-gray-400": !isSelected,
                            }
                          )}
                        >
                          {/* Full-width image */}
                          {combination.image?.src_md ? (
                            <div className="w-full aspect-[16/9] bg-gray-50">
                              <img
                                src={combination.image.src_md}
                                alt={name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-[16/9] bg-gray-100 flex items-center justify-center">
                              <span className="text-sm text-gray-400">{name}</span>
                            </div>
                          )}

                          {/* Label bar */}
                          <div className={clx(
                            "px-3 py-2 flex items-center justify-between",
                            {
                              "bg-[#1e2a3a] text-white": isSelected,
                              "bg-gold-20 text-gray-700": !isSelected,
                            }
                          )}>
                            <span className="text-sm font-medium">{name}</span>
                            {isSelected && (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default FabricCombinationDrawer
