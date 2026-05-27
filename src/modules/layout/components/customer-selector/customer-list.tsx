"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { searchCustomersForSelector } from "@lib/data/customer-search"
import SearchInput from "@modules/common/components/search-input"
import Button from "@modules/common/components/button"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"

const DEBOUNCE_MS = 250

type Props = { onPick: () => void }

export default function CustomerList({ onPick }: Props) {
  const { actingCustomer, setActingCustomer, clearActingCustomer } =
    useActingCustomer()
  const acting = actingCustomer as SearchCustomerResult | null
  const actingId = acting?.id ?? null
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchCustomerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = ++seqRef.current
    const handle = setTimeout(
      async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await searchCustomersForSelector(
            query ? { query, limit: 20 } : { query: "", limit: 10 }
          )
          if (seq !== seqRef.current) return
          setResults(data)
        } catch (e) {
          if (seq !== seqRef.current) return
          setError("Could not load customers. Try again.")
        } finally {
          if (seq === seqRef.current) setLoading(false)
        }
      },
      query ? DEBOUNCE_MS : 0
    )
    return () => clearTimeout(handle)
  }, [query, retryTick])

  const displayResults = useMemo<SearchCustomerResult[]>(() => {
    // Pin the acting customer to the top of the Recent list (no query mode).
    if (!query && acting && actingId != null) {
      return [acting, ...results.filter((r) => r.id !== actingId)]
    }
    return results
  }, [query, acting, actingId, results])

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 p-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search customers..."
          autoFocus
        />
      </div>
      <p className="px-3 pt-2 text-xs uppercase text-gray-500">
        {query ? "Results" : "Recent"}
      </p>
      {loading && (
        <p className="px-3 py-4 text-sm text-gray-500">Loading...</p>
      )}
      {error && (
        <div className="flex flex-col gap-2 px-3 py-4 text-sm text-red-600">
          <span>{error}</span>
          <Button
            variant="outline"
            className="self-start px-4 py-1.5 text-xs"
            onClick={() => setRetryTick((t) => t + 1)}
          >
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && displayResults.length === 0 && (
        <p className="px-3 py-4 text-sm text-gray-500">No customers found</p>
      )}
      {!loading && !error && displayResults.length > 0 && (
        <ul className="max-h-72 overflow-y-auto">
          {displayResults.map((c) => {
            const isActing = actingId != null && c.id === actingId
            return (
              <li
                key={c.id}
                className={
                  isActing ? "border-l-2 border-gold bg-gold/10" : undefined
                }
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    className={`flex-1 px-3 py-2 text-left ${
                      isActing ? "hover:bg-gold/20" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setActingCustomer(c)
                      onPick()
                    }}
                  >
                    <span className="block font-mono text-xs text-gray-500">
                      {c.account_code}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-dark-blue">
                        {c.b2b_company_name ?? c.name}
                      </span>
                      {c.customer_group?.name && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                          {c.customer_group.name}
                        </span>
                      )}
                    </span>
                    {c.email && (
                      <span className="block text-xs text-gray-500">
                        {c.email}
                      </span>
                    )}
                  </button>
                  {isActing && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearActingCustomer()
                        onPick()
                      }}
                      aria-label="Clear acting customer"
                      className="flex items-center px-3 text-dark-blue hover:bg-gold/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
