import { GraphQLClient } from "./client"
import { ClientConfig } from "./client/types"
import { CustomerModule } from "./modules/customer"
import { CartModule } from "./modules/cart"
import { ProductPhotosModule } from "./modules/product-photos"
import { ShopSettingsModule } from "./modules/shop-settings"

export class FurnisystemsSDK {
  private client: GraphQLClient
  private config: ClientConfig

  // Module instances
  public customer: CustomerModule
  public cart: CartModule
  public productPhotos: ProductPhotosModule
  public shopSettings: ShopSettingsModule

  constructor(config: ClientConfig) {
    this.config = config
    this.client = new GraphQLClient(config)

    // Initialize modules
    this.customer = new CustomerModule(this.client)
    this.cart = new CartModule(this.client)
    this.productPhotos = new ProductPhotosModule(this.config.restApiEndpoint!)
    this.shopSettings = new ShopSettingsModule(this.client)
  }

  // Set authentication headers for all requests
  setAuthHeaders(headers: {
    authorization?: string
    "x-publishable-api-key"?: string
  }) {
    this.client.setAuthHeaders(headers)
  }

  // Clear authentication headers
  clearAuthHeaders() {
    this.client.clearAuthHeaders()
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
export * from "./modules/product-photos"
export * from "./modules/shop-settings"

// Default export
export default FurnisystemsSDK
