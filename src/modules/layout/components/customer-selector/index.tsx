"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { ChevronDown, X } from "lucide-react"
import { Fragment } from "react"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import CustomerList from "./customer-list"

export default function CustomerSelector() {
  const { actingCustomer, clearActingCustomer, isAgentOrAdmin } =
    useActingCustomer()

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
    <Popover className="relative">
      {({ close }) => (
        <>
          <div className="flex items-center gap-2">
            <PopoverButton
              className={`flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${
                ac
                  ? "border-gray-300 text-dark-blue hover:bg-gray-50"
                  : "border-gold text-gold hover:bg-gold/10"
              }`}
            >
              <span className="max-w-[240px] truncate">{labelTop}</span>
              <ChevronDown className="h-4 w-4" />
            </PopoverButton>
            {ac && (
              <button
                type="button"
                onClick={clearActingCustomer}
                aria-label="Clear acting customer"
                className="rounded border border-gray-300 p-1 text-dark-blue hover:bg-gray-50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 -translate-y-1"
          >
            <PopoverPanel className="absolute left-0 z-30 mt-1 w-[360px] rounded border border-gray-200 bg-white shadow-lg">
              <CustomerList onPick={() => close()} />
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
