import FurnisystemsSDK from "./furnisystems-sdk"
import Medusa from "@medusajs/js-sdk"

// Furnisystems SDK configuration
let BACKEND_GRAPHQL = "http://localhost:4000/graphql"
let BACKEND_REST_API = "http://localhost:4000/api"

if (process.env.BACKEND_GRAPHQL) {
  BACKEND_GRAPHQL = process.env.BACKEND_GRAPHQL
}

if (process.env.BACKEND_REST_API) {
  BACKEND_REST_API = process.env.BACKEND_REST_API
}

export const sdk = new FurnisystemsSDK({
  graphqlEndpoint: BACKEND_GRAPHQL,
  restApiEndpoint: BACKEND_REST_API,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY,
})
