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
