import FurnisystemsSDK from "./furnisystems-sdk"
import Medusa from "@medusajs/js-sdk"

// Furnisystems SDK configuration
let FURNISYSTEMS_BACKEND_URL = "http://localhost:4000/graphql"

if (process.env.FURNISYSTEMS_BACKEND_URL) {
  FURNISYSTEMS_BACKEND_URL = process.env.FURNISYSTEMS_BACKEND_URL
}

export const sdk = new FurnisystemsSDK({
  graphqlEndpoint: FURNISYSTEMS_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY,
})

// Legacy Medusa SDK - keeping as main export for gradual migration
// TODO: Replace with furnisystemsSDK once all data layer is migrated
// let MEDUSA_BACKEND_URL = "http://localhost:9000"

// if (process.env.FURNISYSTEMS_BACKEND_URL) {
//   MEDUSA_BACKEND_URL = process.env.FURNISYSTEMS_BACKEND_URL
// }

// export const sdk = new Medusa({
//   baseUrl: MEDUSA_BACKEND_URL,
//   debug: process.env.NODE_ENV === "development",
//   publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
// })
