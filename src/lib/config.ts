import FurnisystemsSDK from "./furnisystems-sdk"

export const sdk = new FurnisystemsSDK({
  graphqlEndpoint: process.env.NEXT_PUBLIC_BACKEND_GRAPHQL || "",
  restApiEndpoint: process.env.NEXT_PUBLIC_BACKEND_REST_API || "",
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY,
})
