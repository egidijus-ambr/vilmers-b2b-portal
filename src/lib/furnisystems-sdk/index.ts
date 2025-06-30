import { GraphQLClient } from "./client"
import { ClientConfig } from "./client/types"
import { CustomerModule } from "./modules/customer"
import { CartModule } from "./modules/cart"

export class FurnisystemsSDK {
  private client: GraphQLClient

  // Module instances
  public customer: CustomerModule
  public cart: CartModule

  constructor(config: ClientConfig) {
    this.client = new GraphQLClient(config)

    // Initialize modules
    this.customer = new CustomerModule(this.client)
    this.cart = new CartModule(this.client)
  }

  // Set authentication headers for all requests
  setAuthHeaders(headers: {
    authorization?: string
    "x-publishable-api-key"?: string
  }) {
    this.client.setAuthHeaders(headers)
  }

  // Get the underlying Apollo Client for advanced usage
  getApolloClient() {
    return this.client.getClient()
  }

  // Clear Apollo cache
  clearCache() {
    this.client.clearCache()
  }

  // Reset Apollo cache
  resetCache() {
    this.client.resetCache()
  }
}

// Export types and errors
export * from "./types/common"
export * from "./client/errors"
export * from "./client/types"
export * from "./modules/customer"
export * from "./modules/cart"

// Default export
export default FurnisystemsSDK
