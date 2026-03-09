import { GraphQLClient } from "./client"
import { ClientConfig } from "./client/types"
import { CustomerModule } from "./modules/customer"
import { CartModule } from "./modules/cart"
import { ProductPhotosModule } from "./modules/product-photos"
import { ProductCataloguesModule } from "./modules/product-catalogues"
import { ShopSettingsModule } from "./modules/shop-settings"
import { PagesModule } from "./modules/pages"
import { CategoriesModule } from "./modules/categories"
import { ProductsModule } from "./modules/products"
import { FiltersModule } from "./modules/filters"

export class FurnisystemsSDK {
  private client: GraphQLClient
  private config: ClientConfig

  // Module instances
  public customer: CustomerModule
  public cart: CartModule
  public productPhotos: ProductPhotosModule
  public productCatalogues: ProductCataloguesModule
  public shopSettings: ShopSettingsModule
  public pages: PagesModule
  public categories: CategoriesModule
  public products: ProductsModule
  public filters: FiltersModule

  constructor(config: ClientConfig) {
    this.config = config
    this.client = new GraphQLClient(config)

    // Initialize modules
    this.customer = new CustomerModule(this.client)
    this.cart = new CartModule(this.client)
    this.productPhotos = new ProductPhotosModule(this.config.restApiEndpoint!)
    this.productCatalogues = new ProductCataloguesModule(this.config.restApiEndpoint!)
    this.shopSettings = new ShopSettingsModule(this.client)
    this.pages = new PagesModule(this.client)
    this.categories = new CategoriesModule(this.client)
    this.products = new ProductsModule(this.client)
    this.filters = new FiltersModule(this.client)
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
export * from "./modules/product-catalogues"
export * from "./modules/shop-settings"
export * from "./modules/pages"
export * from "./modules/categories"
export * from "./modules/products"
export * from "./modules/filters"

// Default export
export default FurnisystemsSDK
