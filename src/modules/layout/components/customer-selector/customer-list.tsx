"use client"

import { useEffect, useRef, useState } from "react"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { sdk } from "@lib/config"
import SearchInput from "@modules/common/components/search-input"
import Button from "@modules/common/components/button"
import type { SearchCustomerResult } from "@lib/furnisystems-sdk/modules/customer/types"

const DEBOUNCE_MS = 250

type Props = { onPick: () => void }

export default function CustomerList({ onPick }: Props) {
  const { setActingCustomer } = useActingCustomer()
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
          const data = await sdk.customer.searchCustomers(
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
      {!loading && !error && results.length === 0 && (
        <p className="px-3 py-4 text-sm text-gray-500">No customers found</p>
      )}
      {!loading && !error && results.length > 0 && (
        <ul className="max-h-72 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  setActingCustomer(c)
                  onPick()
                }}
              >
                <span className="font-mono text-xs text-gray-500">
                  {c.account_code}
                </span>{" "}
                <span className="font-medium text-dark-blue">
                  {c.b2b_company_name ?? c.name}
                </span>
                {c.email && (
                  <span className="block text-xs text-gray-500">{c.email}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
