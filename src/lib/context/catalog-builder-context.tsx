"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { sdk } from "@lib/config"
import { CatalogueFile } from "@lib/furnisystems-sdk/modules/product-catalogues/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogBuilderContextType {
  // Current page product names (set by sync component)
  pageProductNames: string[]
  setPageProductNames: (names: string[]) => void

  // All product names across all pages (loaded on demand)
  allProductNames: string[]
  allProductNamesLoading: boolean

  // Filter tracking — resets state when filters change
  filterKey: string
  setFilterKey: (key: string) => void

  // Catalogue availability (incrementally built)
  catalogueMap: Record<string, CatalogueFile[]>
  catalogueLoading: boolean

  // Selection state (persists across page navigation)
  selectionMode: boolean
  toggleSelectionMode: () => void
  selectedProducts: Set<string>
  toggleProduct: (name: string) => void
  selectAll: () => Promise<void>
  deselectAll: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CatalogBuilderContext = createContext<
  CatalogBuilderContextType | undefined
>(undefined)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50

async function fetchCataloguesForNames(
  names: string[],
  existing: Record<string, CatalogueFile[]>
): Promise<Record<string, CatalogueFile[]>> {
  // Only fetch names we don't already have
  const newNames = names.filter((n) => !(n in existing))
  if (newNames.length === 0) return existing

  const merged = { ...existing }

  // Batch in groups of 50 (backend limit)
  for (let i = 0; i < newNames.length; i += BATCH_SIZE) {
    const batch = newNames.slice(i, i + BATCH_SIZE)
    try {
      const data =
        await sdk.productCatalogues.getBatchProductCatalogues(batch)
      for (const [name, entry] of Object.entries(data.products)) {
        merged[name] = entry.catalogues
      }
    } catch (err) {
      console.error("Failed to fetch catalogues for batch:", err)
    }
  }

  return merged
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CatalogBuilderProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Filter key — when this changes, all state resets
  const [filterKey, setFilterKeyState] = useState("")

  // Product names
  const [pageProductNames, setPageProductNamesState] = useState<string[]>([])
  const [allProductNames, setAllProductNames] = useState<string[]>([])
  const [allProductNamesLoading, setAllProductNamesLoading] = useState(false)

  // Catalogue map — grows incrementally
  const [catalogueMap, setCatalogueMap] = useState<
    Record<string, CatalogueFile[]>
  >({})
  const catalogueMapRef = useRef<Record<string, CatalogueFile[]>>({})
  catalogueMapRef.current = catalogueMap
  const [catalogueLoading, setCatalogueLoading] = useState(false)

  // Selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  )

  // Version counter to cancel stale async operations
  const filterVersionRef = useRef(0)

  // Guard against concurrent selectAll calls
  const selectAllInProgress = useRef(false)

  // --- Filter key setter: resets all state on change ---
  const setFilterKey = useCallback((key: string) => {
    setFilterKeyState((prev) => {
      if (prev === key) return prev
      filterVersionRef.current++
      setAllProductNames([])
      setSelectedProducts(new Set())
      setCatalogueMap({})
      setSelectionMode(false)
      return key
    })
  }, [])

  // --- Page product names setter: triggers incremental catalogue fetch ---
  const setPageProductNames = useCallback((names: string[]) => {
    setPageProductNamesState(names)
  }, [])

  // Fetch catalogues for current page products when they change
  useEffect(() => {
    if (pageProductNames.length === 0) return
    let cancelled = false

    const run = async () => {
      setCatalogueLoading(true)
      const updated = await fetchCataloguesForNames(
        pageProductNames,
        catalogueMapRef.current
      )
      if (!cancelled) {
        setCatalogueMap(updated)
        setCatalogueLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // Only re-run when pageProductNames changes, not catalogueMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageProductNames])

  // --- Selection mode ---
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedProducts(new Set())
        setAllProductNames([])
      }
      return !prev
    })
  }, [])

  const toggleProduct = useCallback((name: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  // --- Select all: fetches all product names + their catalogues ---
  const selectAll = useCallback(async () => {
    if (selectAllInProgress.current) return
    selectAllInProgress.current = true
    const version = filterVersionRef.current

    try {
      let names = allProductNames

      // If we haven't fetched all names yet, fetch them
      if (names.length === 0) {
        setAllProductNamesLoading(true)
        try {
          const [permalink, attrs, sort, cats] = filterKey.split("|")
          const params = new URLSearchParams()
          if (permalink) params.set("permalink", permalink)
          params.set("language", "en")
          if (sort) params.set("sort", sort)
          if (attrs) params.set("attrs", attrs)
          if (cats) params.set("cats", cats)

          const langMatch = window.location.pathname.match(/^\/([a-z]{2})\//)
          if (langMatch) params.set("language", langMatch[1])

          const res = await fetch(
            `/api/category-product-names?${params.toString()}`
          )
          if (res.ok) {
            const data = await res.json()
            names = data.names ?? []
            if (filterVersionRef.current !== version) return
            setAllProductNames(names)
          }
        } catch (err) {
          console.error("Failed to fetch all product names:", err)
        } finally {
          setAllProductNamesLoading(false)
        }
      }

      if (names.length === 0 || filterVersionRef.current !== version) return

      // Fetch catalogues for all names
      setCatalogueLoading(true)
      const updated = await fetchCataloguesForNames(names, catalogueMapRef.current)
      if (filterVersionRef.current !== version) return
      setCatalogueMap(updated)
      setCatalogueLoading(false)

      // Select all that have catalogues
      const withCatalogues = names.filter(
        (name) => (updated[name] ?? []).length > 0
      )
      setSelectedProducts(new Set(withCatalogues))
    } finally {
      selectAllInProgress.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProductNames, filterKey])

  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set())
  }, [])

  return (
    <CatalogBuilderContext.Provider
      value={{
        pageProductNames,
        setPageProductNames,
        allProductNames,
        allProductNamesLoading,
        filterKey,
        setFilterKey,
        catalogueMap,
        catalogueLoading,
        selectionMode,
        toggleSelectionMode,
        selectedProducts,
        toggleProduct,
        selectAll,
        deselectAll,
      }}
    >
      {children}
    </CatalogBuilderContext.Provider>
  )
}

export function useCatalogBuilder() {
  return useContext(CatalogBuilderContext)
}

export function useRequiredCatalogBuilder() {
  const context = useContext(CatalogBuilderContext)
  if (context === undefined) {
    throw new Error(
      "useRequiredCatalogBuilder must be used within a CatalogBuilderProvider"
    )
  }
  return context
}
