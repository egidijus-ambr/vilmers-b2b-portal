"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { ChevronDown } from "lucide-react"
import { Fragment } from "react"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import CustomerList from "./customer-list"

export default function CustomerSelector() {
  const { actingCustomer, isAgentOrAdmin } = useActingCustomer()

  if (!isAgentOrAdmin) return null

  const ac = actingCustomer as
    | {
        account_code?: string | null
        b2b_company_name?: string | null
        name?: string | null
      }
    | null

  const labelTop = ac
    ? `${ac.account_code ?? ""}${ac.account_code ? " - " : ""}${
        ac.b2b_company_name ?? ac.name ?? ""
      }`
    : "Select customer"

  return (
    <Popover className="relative min-w-0 max-w-full small:w-[36rem]">
      {({ close }) => (
        <>
          <PopoverButton
            className={`flex w-full items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
              ac
                ? "border-gray-300 text-dark-blue hover:bg-gray-50"
                : "border-gold text-gold hover:bg-gold/10"
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-left">{labelTop}</span>
            <ChevronDown className="h-4 w-4" />
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 -translate-y-1"
          >
            <PopoverPanel className="absolute right-0 z-30 mt-1 w-[calc(100vw-2rem)] xsmall:w-[min(920px,calc(100vw-2rem))] rounded border border-gray-200 bg-white shadow-lg">
              <CustomerList onPick={() => close()} />
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
