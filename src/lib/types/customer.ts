import { HttpTypes } from "@medusajs/types"
import { Customer as SDKCustomer } from "@lib/furnisystems-sdk/modules/customer/types"

/**
 * Extended StoreCustomer type with B2B portal specific fields
 * Combines Medusa's StoreCustomer with our custom SDK Customer fields
 */
export type ExtendedStoreCustomer = HttpTypes.StoreCustomer & Omit<SDKCustomer, keyof HttpTypes.StoreCustomer>
