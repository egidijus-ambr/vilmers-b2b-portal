"use client"

import React, { createContext, useContext, useReducer, useCallback } from "react"
import type {
  ConfiguratorProductData,
  SofaFormExtended,
  SelectedFabricState,
  SelectedFabricCombinationState,
  ComponentGroup,
  SelectedComponent,
} from "../lib/types"

// =============================================
// State
// =============================================

export interface ConfiguratorState {
  // Product data (loaded on-demand)
  productData: ConfiguratorProductData | null
  isLoading: boolean
  error: string | null

  // Sofa shapes
  sofaForms: SofaFormExtended[]
  sofaCombinations: any[][] // Konva node arrays
  sofaScale: number

  // Fabrics
  selectedFabric: SelectedFabricState
  selectedFabricCombination: SelectedFabricCombinationState

  // Additional components
  additionalComponentGroups: ComponentGroup[]
  selectedAdditionalComponents: SelectedComponent[]
  originalComponentGroups: ComponentGroup[]
  currentStep: number

  // Price & UI
  totalPrice: number | null
  componentsPriceTotal: number | null
  pricesPerModule: Record<string, number> | null
  referenceText: string
  quantity: number
}

const initialState: ConfiguratorState = {
  productData: null,
  isLoading: false,
  error: null,

  sofaForms: [],
  sofaCombinations: [],
  sofaScale: 1,

  selectedFabric: {
    fabricGroupObject: null,
    fabricObject: null,
    combinationFabrics: null,
  },
  selectedFabricCombination: {
    fabricCombination: null,
  },

  additionalComponentGroups: [],
  selectedAdditionalComponents: [],
  originalComponentGroups: [],
  currentStep: 0,

  totalPrice: null,
  componentsPriceTotal: null,
  pricesPerModule: null,
  referenceText: "",
  quantity: 1,
}

// =============================================
// Actions
// =============================================

type ConfiguratorAction =
  | { type: "SET_PRODUCT_DATA"; payload: ConfiguratorProductData }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SOFA_FORMS"; payload: SofaFormExtended[] }
  | { type: "SET_SOFA_COMBINATIONS"; payload: any[][] }
  | { type: "SET_SOFA_SCALE"; payload: number }
  | { type: "SET_FABRIC"; payload: SelectedFabricState }
  | { type: "SET_FABRIC_COMBINATION"; payload: SelectedFabricCombinationState }
  | { type: "SET_COMPONENT_GROUPS"; payload: ComponentGroup[] }
  | { type: "SET_SELECTED_COMPONENTS"; payload: SelectedComponent[] }
  | { type: "SET_ORIGINAL_COMPONENT_GROUPS"; payload: ComponentGroup[] }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "SET_TOTAL_PRICE"; payload: number | null }
  | { type: "SET_COMPONENTS_PRICE"; payload: number | null }
  | { type: "SET_PRICES_PER_MODULE"; payload: Record<string, number> | null }
  | { type: "SET_REFERENCE_TEXT"; payload: string }
  | { type: "SET_QUANTITY"; payload: number }
  | { type: "RESET" }

function configuratorReducer(
  state: ConfiguratorState,
  action: ConfiguratorAction
): ConfiguratorState {
  switch (action.type) {
    case "SET_PRODUCT_DATA":
      return { ...state, productData: action.payload, isLoading: false, error: null }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }
    case "SET_SOFA_FORMS":
      return { ...state, sofaForms: action.payload }
    case "SET_SOFA_COMBINATIONS":
      return { ...state, sofaCombinations: action.payload }
    case "SET_SOFA_SCALE":
      return { ...state, sofaScale: action.payload }
    case "SET_FABRIC":
      return { ...state, selectedFabric: action.payload }
    case "SET_FABRIC_COMBINATION":
      return { ...state, selectedFabricCombination: action.payload }
    case "SET_COMPONENT_GROUPS":
      return { ...state, additionalComponentGroups: action.payload }
    case "SET_SELECTED_COMPONENTS":
      return { ...state, selectedAdditionalComponents: action.payload }
    case "SET_ORIGINAL_COMPONENT_GROUPS":
      return { ...state, originalComponentGroups: action.payload }
    case "SET_CURRENT_STEP":
      return { ...state, currentStep: action.payload }
    case "SET_TOTAL_PRICE":
      return { ...state, totalPrice: action.payload }
    case "SET_COMPONENTS_PRICE":
      return { ...state, componentsPriceTotal: action.payload }
    case "SET_PRICES_PER_MODULE":
      return { ...state, pricesPerModule: action.payload }
    case "SET_REFERENCE_TEXT":
      return { ...state, referenceText: action.payload }
    case "SET_QUANTITY":
      return { ...state, quantity: action.payload }
    case "RESET":
      return initialState
    default:
      return state
  }
}

// =============================================
// Context
// =============================================

interface ConfiguratorContextValue {
  state: ConfiguratorState
  dispatch: React.Dispatch<ConfiguratorAction>
  reset: () => void
}

const ConfiguratorContext = createContext<ConfiguratorContextValue | null>(null)

// =============================================
// Provider
// =============================================

interface ConfiguratorProviderProps {
  children: React.ReactNode
}

export const ConfiguratorProvider = ({ children }: ConfiguratorProviderProps) => {
  const [state, dispatch] = useReducer(configuratorReducer, initialState)

  const reset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  return (
    <ConfiguratorContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}

// =============================================
// Hook
// =============================================

export const useConfigurator = () => {
  const context = useContext(ConfiguratorContext)
  if (!context) {
    throw new Error("useConfigurator must be used within a ConfiguratorProvider")
  }
  return context
}
