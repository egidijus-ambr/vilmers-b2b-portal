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

/**
 * A product as the catalogue builder addresses it. `id` is the product
 * container id and is the ONLY key: names are not unique (e.g. the PURE FLOW
 * bed and the PURE FLOW pet bed), so keying by name merged their catalogues
 * and their selection state. `name` is for display only.
 */
export interface ProductRef {
  id: number
  name: string
}

interface CatalogBuilderContextType {
  // Current page products (set by sync component)
  pageProducts: ProductRef[]
  setPageProducts: (items: ProductRef[]) => void

  // All products across all pages (loaded on demand)
  allProducts: ProductRef[]
  allProductNamesLoading: boolean

  // Filter tracking — resets state when filters change
  filterKey: string
  setFilterKey: (key: string) => void

  // Catalogue availability keyed by product container id (incrementally built)
  catalogueMap: Record<number, CatalogueFile[]>
  catalogueLoading: boolean

  // Display names keyed by product container id (for warnings / labels)
  nameById: Record<number, string>

  // Selection state (persists across page navigation), product container ids
  selectionMode: boolean
  toggleSelectionMode: () => void
  selectedProducts: Set<number>
  toggleProduct: (productId: number) => void
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

// Ids per batch request (backend cap is MAX_PRODUCTS_PER_LISTING = 500).
const BATCH_SIZE = 200

async function fetchCataloguesForIds(
  ids: number[],
  existing: Record<number, CatalogueFile[]>
): Promise<Record<number, CatalogueFile[]>> {
  const newIds = Array.from(new Set(ids)).filter((id) => !(id in existing))
  if (newIds.length === 0) return existing

  const mergedMap = { ...existing }

  for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
    const batch = newIds.slice(i, i + BATCH_SIZE)
    try {
      const data = await sdk.productCatalogues.getBatchProductCatalogues(batch)
      for (const id of batch) {
        mergedMap[id] = data.products[String(id)]?.catalogues ?? []
      }
    } catch (err) {
      console.error("Failed to fetch catalogues for batch:", err)
    }
  }

  return mergedMap
}

function mergeNames(
  prev: Record<number, string>,
  items: ProductRef[]
): Record<number, string> {
  let next = prev
  for (const it of items) {
    if (next[it.id] !== it.name) {
      if (next === prev) next = { ...prev }
      next[it.id] = it.name
    }
  }
  return next
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
  const [allProducts, setAllProducts] = useState<ProductRef[]>([])
  const [allProductNamesLoading, setAllProductNamesLoading] = useState(false)

  // Catalogue map — grows incrementally, keyed by product container id
  const [catalogueMap, setCatalogueMap] = useState<
    Record<number, CatalogueFile[]>
  >({})
  const catalogueMapRef = useRef<Record<number, CatalogueFile[]>>({})
  catalogueMapRef.current = catalogueMap
  const [catalogueLoading, setCatalogueLoading] = useState(false)

  // Display names keyed by id — merged from every page that loads
  const [nameById, setNameById] = useState<Record<number, string>>({})

  // Selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
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
      setAllProducts([])
      setSelectedProducts(new Set())
      setCatalogueMap({})
      setNameById({})
      setSelectionMode(false)
      return key
    })
  }, [])

  // --- Page products setter: triggers incremental catalogue fetch ---
  const setPageProducts = useCallback((items: ProductRef[]) => {
    setPageProductsState(items)
    setNameById((prev) => mergeNames(prev, items))
  }, [])

  // Fetch catalogues for current page products when they change
  useEffect(() => {
    if (pageProducts.length === 0) return
    let cancelled = false

    const run = async () => {
      setCatalogueLoading(true)
      const updatedMap = await fetchCataloguesForIds(
        pageProducts.map((p) => p.id),
        catalogueMapRef.current
      )
      if (!cancelled) {
        setCatalogueMap(updatedMap)
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
        setAllProducts([])
      }
      return !prev
    })
  }, [])

  const toggleProduct = useCallback((productId: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }, [])

  // --- Select all: fetches all products (with ids) + their catalogues ---
  const selectAll = useCallback(async () => {
    if (selectAllInProgress.current) return
    selectAllInProgress.current = true
    const version = filterVersionRef.current

    try {
      let products = allProducts

      // If we haven't fetched all products yet, fetch them
      if (products.length === 0) {
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
            products = Array.isArray(data.products) ? data.products : []
            if (filterVersionRef.current !== version) return
            setAllProducts(products)
          }
        } catch (err) {
          console.error("Failed to fetch all product names:", err)
        } finally {
          setAllProductNamesLoading(false)
        }
      }

      if (products.length === 0 || filterVersionRef.current !== version) return

      setNameById((prev) => mergeNames(prev, products))

      setCatalogueLoading(true)
      const updated = await fetchCataloguesForIds(
        products.map((p) => p.id),
        catalogueMapRef.current
      )
      if (filterVersionRef.current !== version) return
      setCatalogueMap(updated)
      setCatalogueLoading(false)

      // Select all that have catalogues
      const withCatalogues = products
        .map((p) => p.id)
        .filter((id) => (updated[id] ?? []).length > 0)
      setSelectedProducts(new Set(withCatalogues))
    } finally {
      selectAllInProgress.current = false
    }
  }, [allProducts, filterKey])

  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set())
  }, [])

  return (
    <CatalogBuilderContext.Provider
      value={{
        pageProducts,
        setPageProducts,
        allProducts,
        allProductNamesLoading,
        filterKey,
        setFilterKey,
        catalogueMap,
        catalogueLoading,
        nameById,
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
