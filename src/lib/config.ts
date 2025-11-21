import FurnisystemsSDK from "./furnisystems-sdk"

console.log("Furnisystems SDK Configuration:")
console.log("GRAPHQL Endpoint:", process.env.BACKEND_GRAPHQL)
console.log("REST API Endpoint:", process.env.BACKEND_REST_API)

export const sdk = new FurnisystemsSDK({
  graphqlEndpoint: process.env.BACKEND_GRAPHQL || "",
  restApiEndpoint: process.env.BACKEND_REST_API || "",
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY,
})
