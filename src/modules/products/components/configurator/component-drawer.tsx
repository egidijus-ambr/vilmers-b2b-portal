"use client"

import React, { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { useConfigurator } from "@configurator/context/configurator-context"
import ComponentDrawerCard from "./component-drawer-card"
import type { AdditionalComponent, ComponentGroup, SelectedComponent } from "@configurator/lib/types"

type ComponentDrawerProps = {
  isOpen: boolean
  close: () => void
  group: ComponentGroup
  validComponents: AdditionalComponent[]
  title: string
  languageCode: string
}

const ComponentDrawer = ({
  isOpen,
  close,
  group,
  validComponents,
  title,
  languageCode,
}: ComponentDrawerProps) => {
  const { state, dispatch } = useConfigurator()

  // Current selected component id
  const selectedComponent = state.selectedAdditionalComponents.find(
    (c) => c.groupCode === group.code
  )
  const selectedId = selectedComponent?.id ?? null

  const handleSelect = (component: AdditionalComponent) => {
    // Replace selection for this group
    const updated: SelectedComponent[] = [
      ...state.selectedAdditionalComponents.filter(
        (c) => c.groupCode !== group.code
      ),
      {
        ...component,
        groupCode: group.code,
        groupNameOverride: typeof group.nameOverride === "string" ? group.nameOverride : undefined,
      },
    ]
    dispatch({ type: "SET_SELECTED_COMPONENTS", payload: updated })
    close()
  }

  const getName = (component: AdditionalComponent): string => {
    const profile =
      component.additional_component_profiles?.find(
        (p) => p.language === languageCode
      ) ?? component.additional_component_profiles?.[0]
    return profile?.name ?? component.code ?? `Component ${component.id}`
  }

  const getDescription = (component: AdditionalComponent): string | null => {
    const profile =
      component.additional_component_profiles?.find(
        (p) => p.language === languageCode
      ) ?? component.additional_component_profiles?.[0]
    return profile?.description ?? null
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
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
                <Dialog.Panel className="w-screen max-w-[700px] bg-gold-20 shadow-xl flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <Dialog.Title className="text-lg font-semibold">
                      {title}
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

                  {/* Component cards grid */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {validComponents.map((component) => (
                        <ComponentDrawerCard
                          key={component.id}
                          component={component}
                          name={getName(component)}
                          description={getDescription(component)}
                          isSelected={selectedId === component.id}
                          onClick={() => handleSelect(component)}
                        />
                      ))}
                    </div>
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

export default ComponentDrawer
