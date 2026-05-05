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

export interface ProductRef {
  name: string
  reference?: string | null
}

interface CatalogBuilderContextType {
  // Current page products (set by sync component)
  pageProducts: ProductRef[]
  setPageProducts: (items: ProductRef[]) => void

  // All product names across all pages (loaded on demand)
  allProductNames: string[]
  allProductNamesLoading: boolean

  // Filter tracking — resets state when filters change
  filterKey: string
  setFilterKey: (key: string) => void

  // Catalogue availability (incrementally built)
  catalogueMap: Record<string, CatalogueFile[]>
  catalogueLoading: boolean

  // Reference lookup keyed by product name (for callers building merge requests)
  referenceByName: Record<string, string | undefined>

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

async function fetchCataloguesForRefs(
  items: ProductRef[],
  existing: Record<string, CatalogueFile[]>,
  fetchedReferences: Record<string, string | null>
): Promise<{
  catalogueMap: Record<string, CatalogueFile[]>
  fetchedReferenceByName: Record<string, string | null>
}> {
  // Fetch names we don't have, plus names whose stored reference differs from
  // the now-known reference (refresh stale entries)
  const newItems = items.filter((it) => {
    const incomingRef = it.reference ?? null
    if (!(it.name in existing)) return true
    const fetchedRef = fetchedReferences[it.name] ?? null
    return fetchedRef !== incomingRef
  })
  if (newItems.length === 0) {
    return { catalogueMap: existing, fetchedReferenceByName: fetchedReferences }
  }

  const mergedMap = { ...existing }
  const mergedRefs = { ...fetchedReferences }

  // Batch in groups of 50 (backend limit)
  for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
    const batch = newItems.slice(i, i + BATCH_SIZE)
    const names = batch.map((it) => it.name)
    const references = batch.map((it) => it.reference ?? undefined)
    try {
      const data = await sdk.productCatalogues.getBatchProductCatalogues(
        names,
        references
      )
      for (const [name, entry] of Object.entries(data.products)) {
        mergedMap[name] = entry.catalogues
      }
      for (const it of batch) {
        mergedRefs[it.name] = it.reference ?? null
      }
    } catch (err) {
      console.error("Failed to fetch catalogues for batch:", err)
    }
  }

  return { catalogueMap: mergedMap, fetchedReferenceByName: mergedRefs }
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

  // Page products
  const [pageProducts, setPageProductsState] = useState<ProductRef[]>([])
  const [allProductNames, setAllProductNames] = useState<string[]>([])
  const [allProductNamesLoading, setAllProductNamesLoading] = useState(false)

  // Catalogue map — grows incrementally
  const [catalogueMap, setCatalogueMap] = useState<
    Record<string, CatalogueFile[]>
  >({})
  const catalogueMapRef = useRef<Record<string, CatalogueFile[]>>({})
  catalogueMapRef.current = catalogueMap
  const [catalogueLoading, setCatalogueLoading] = useState(false)

  // Tracks the reference value used the last time each name was fetched
  // (`null` = fetched without reference). Lets us detect when a previously
  // cached entry was fetched against a stale/missing reference and needs refresh.
  const [fetchedReferenceByName, setFetchedReferenceByName] = useState<
    Record<string, string | null>
  >({})
  const fetchedReferenceByNameRef = useRef<Record<string, string | null>>({})
  fetchedReferenceByNameRef.current = fetchedReferenceByName

  // Reference lookup keyed by name — merged from every page that loads
  const [referenceByName, setReferenceByName] = useState<
    Record<string, string | undefined>
  >({})

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
      setFetchedReferenceByName({})
      setReferenceByName({})
      setSelectionMode(false)
      return key
    })
  }, [])

  // --- Page products setter: triggers incremental catalogue fetch ---
  const setPageProducts = useCallback((items: ProductRef[]) => {
    setPageProductsState(items)
    setReferenceByName((prev) => {
      const next = { ...prev }
      let changed = false
      for (const it of items) {
        const ref = it.reference ?? undefined
        if (ref !== undefined && next[it.name] !== ref) {
          next[it.name] = ref
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  // Fetch catalogues for current page products when they change
  useEffect(() => {
    if (pageProducts.length === 0) return
    let cancelled = false

    const run = async () => {
      setCatalogueLoading(true)
      const { catalogueMap: updatedMap, fetchedReferenceByName: updatedRefs } =
        await fetchCataloguesForRefs(
          pageProducts,
          catalogueMapRef.current,
          fetchedReferenceByNameRef.current
        )
      if (!cancelled) {
        setCatalogueMap(updatedMap)
        setFetchedReferenceByName(updatedRefs)
        setCatalogueLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // Only re-run when pageProducts changes, not catalogueMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageProducts])

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

      // Fetch catalogues for all names — selectAll lacks reference info, so
      // entries already known via referenceByName get reused, others fall back
      // to undefined which the SDK treats as name-only lookup
      setCatalogueLoading(true)
      const items: ProductRef[] = names.map((name) => ({
        name,
        reference: referenceByName[name],
      }))
      const { catalogueMap: updated, fetchedReferenceByName: updatedRefs } =
        await fetchCataloguesForRefs(
          items,
          catalogueMapRef.current,
          fetchedReferenceByNameRef.current
        )
      if (filterVersionRef.current !== version) return
      setCatalogueMap(updated)
      setFetchedReferenceByName(updatedRefs)
      setCatalogueLoading(false)

      // Merge any newly-known references into the lookup
      setReferenceByName((prev) => {
        const next = { ...prev }
        let changed = false
        for (const it of items) {
          const ref = it.reference ?? undefined
          if (ref !== undefined && next[it.name] !== ref) {
            next[it.name] = ref
            changed = true
          }
        }
        return changed ? next : prev
      })

      // Select all that have catalogues
      const withCatalogues = names.filter(
        (name) => (updated[name] ?? []).length > 0
      )
      setSelectedProducts(new Set(withCatalogues))
    } finally {
      selectAllInProgress.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProductNames, filterKey, referenceByName])

  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set())
  }, [])

  return (
    <CatalogBuilderContext.Provider
      value={{
        pageProducts,
        setPageProducts,
        allProductNames,
        allProductNamesLoading,
        filterKey,
        setFilterKey,
        catalogueMap,
        catalogueLoading,
        referenceByName,
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
