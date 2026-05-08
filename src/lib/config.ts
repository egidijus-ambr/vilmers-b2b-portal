import FurnisystemsSDK from "./furnisystems-sdk"

export const sdk = new FurnisystemsSDK({
  graphqlEndpoint: process.env.NEXT_PUBLIC_BACKEND_GRAPHQL || "",
  restApiEndpoint: process.env.NEXT_PUBLIC_BACKEND_REST_API || "",
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY,
  axApiBaseUrl: process.env.VILMERS_AX_API_BASE_URL,
  axApiKey: process.env.VILMERS_AX_API_KEY,
})
